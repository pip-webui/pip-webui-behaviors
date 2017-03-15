/// <reference path="../../typings/tsd.d.ts" />
{
    var thisModule = angular.module("pipDraggable", []);

    thisModule.service('pipDraggable', function () {

        var scope = this;
        scope.inputEvent = function (event) {
            if (angular.isDefined(event.touches)) {
                return event.touches[0];
            }
            //Checking both is not redundent. If only check if touches isDefined, angularjs isDefnied will return error and stop the remaining scripty if event.originalEvent is not defined.
            else if (angular.isDefined(event.originalEvent) && angular.isDefined(event.originalEvent.touches)) {
                return event.originalEvent.touches[0];
            }
            return event;
        };

    });

    thisModule.directive('pipDrag',
        function ($rootScope, $parse, $document, $window, pipDraggable) {
            return {

                restrict: 'A',
                link: function (scope: any, element, attrs: any) {
                    scope.value = attrs.ngDrag;
                    var LONG_PRESS = 50; // 50ms for longpress
                    var offset, _centerAnchor = false, _mx, _my, _tx, _ty, _mrx, _mry;
                    var _hasTouch = ('ontouchstart' in window) || (<any>window).DocumentTouch; // && document instanceof DocumentTouch; // DocumentTouch is not defined!
                    var _pressEvents = 'touchstart mousedown';
                    var _moveEvents = 'touchmove mousemove';
                    var _releaseEvents = 'touchend mouseup';
                    var _dragHandle;

                    // to identify the element in order to prevent getting superflous events when a single element has both drag and drop directives on it.
                    var _myid = scope.$id;
                    var _data = null;

                    var _dragOffset = null;

                    var _dragEnabled = false;

                    var _pressTimer = null;

                    var _elementStyle: any = {};

                    var onDragStartCallback = $parse(attrs.pipDragStart) || null;
                    var onDragStopCallback = $parse(attrs.pipDragStop) || null;
                    var onDragSuccessCallback = $parse(attrs.pipDragSuccess) || null;
                    var allowTransform = angular.isDefined(attrs.allowTransform) ? scope.$eval(attrs.allowTransform) : false;

                    var getDragData = $parse(attrs.pipDragData);
                    var
                        verticalScroll = toBoolean(attrs.pipVerticalScroll) || true,
                        horizontalScroll = toBoolean(attrs.pipHorizontalScroll) || true,
                        activationDistance = parseFloat(attrs.pipActivationDistance) || 75,
                        scrollDistance = parseFloat(attrs.pipScrollDistance) || 50,
                        scrollParent = false,

                        scrollContainer = angular.element(window),
                        scrollContainerGetter = $parse(attrs.pipScrollContainer);

                    // deregistration function for mouse move events in $rootScope triggered by jqLite trigger handler
                    var _deregisterRootMoveListener = angular.noop;

                    initialize();

                    return;

                    //-----------------------------------

                    function initialize() {
                        element.attr('pip-draggable', 'false'); // prevent native drag
                        // check to see if drag handle(s) was specified
                        // if querySelectorAll is available, we use this instead of find
                        // as JQLite find is limited to tagnames
                        let dragHandles: any;
                        if (element[0].querySelectorAll) {
                            dragHandles = angular.element(element[0].querySelectorAll('[pip-drag-handle]'));
                        } else {
                            dragHandles = element.find('[pip-drag-handle]');
                        }
                        if (dragHandles.length) {
                            _dragHandle = dragHandles;
                        }
                        toggleListeners(true);

                        // Initialize scroll container
                        if (scrollParent) {
                            scrollContainer = angular.element(element.parent());
                        } else if (attrs.pipScrollContainer) {
                            scrollContainer = angular.element(scrollContainerGetter(scope));
                        } else {
                            scrollContainer = angular.element(window);
                        }
                    }

                    function toBoolean(value) {
                        if (value == null) return false;
                        if (!value) return false;
                        value = value.toString().toLowerCase();
                        return value == '1' || value == 'true';
                    }

                    function toggleListeners(enable) {
                        if (!enable)return;
                        // add listeners.

                        scope.$on('$destroy', onDestroy);
                        scope.$watch(attrs.pipDrag, onEnableChange);
                        scope.$watch(attrs.pipCenterAnchor, onCenterAnchor);
                        // wire up touch events
                        if (_dragHandle) {
                            // handle(s) specified, use those to initiate drag
                            _dragHandle.on(_pressEvents, onpress);
                        } else {
                            // no handle(s) specified, use the element as the handle
                            element.on(_pressEvents, onpress);
                        }
                        if (!_hasTouch && element[0].nodeName.toLowerCase() == "img") {
                            element.on('mousedown', function () {
                                return false;
                            }); // prevent native drag for images
                        }
                    }
                    
                    function onDestroy(enable) {
                        toggleListeners(false);
                    }

                    function onEnableChange(newVal, oldVal) {
                        _dragEnabled = (newVal);
                    }

                    function onCenterAnchor(newVal, oldVal) {
                        if (angular.isDefined(newVal))
                            _centerAnchor = (newVal || 'true');
                    }

                    function isClickableElement(evt) {
                        return (
                            angular.isDefined(angular.element(evt.target).attr("pip-cancel-drag"))
                        );
                    }

                    /*
                     * When the element is clicked start the drag behaviour
                     * On touch devices as a small delay so as not to prevent native window scrolling
                     */
                    function onpress(evt) {
                        if (!_dragEnabled)return;

                        if (isClickableElement(evt)) {
                            return;
                        }

                        if (evt.type == "mousedown" && evt.button != 0) {
                            // Do not start dragging on right-click
                            return;
                        }

                        saveElementStyles();

                        if (_hasTouch) {
                            cancelPress();
                            _pressTimer = setTimeout(function () {
                                cancelPress();
                                onlongpress(evt);
                            }, LONG_PRESS);
                            $document.on(_moveEvents, cancelPress);
                            $document.on(_releaseEvents, cancelPress);
                        } else {
                            onlongpress(evt);
                        }

                    }

                    function saveElementStyles() {
                        _elementStyle.left = element.css('css') || 0;
                        _elementStyle.top = element.css('top') || 0;
                        _elementStyle.position = element.css('position');
                        _elementStyle.width = element.css('width');    
                    }

                    function cancelPress() {
                        clearTimeout(_pressTimer);
                        $document.off(_moveEvents, cancelPress);
                        $document.off(_releaseEvents, cancelPress);
                    }

                    function onlongpress(evt) {
                        if (!_dragEnabled)return;
                        evt.preventDefault();

                        offset = element[0].getBoundingClientRect();
                        if (allowTransform)
                            _dragOffset = offset;
                        else {
                            _dragOffset = {left: document.body.scrollLeft, top: document.body.scrollTop};
                        }


                        (<any>element).centerX = element[0].offsetWidth / 2;
                        (<any>element).centerY = element[0].offsetHeight / 2;

                        _mx = pipDraggable.inputEvent(evt).pageX;
                        _my = pipDraggable.inputEvent(evt).pageY;
                        _mrx = _mx - offset.left;
                        _mry = _my - offset.top;
                        if (_centerAnchor) {
                            _tx = _mx - (<any>element).centerX - $window.pageXOffset;
                            _ty = _my - (<any>element).centerY - $window.pageYOffset;
                        } else {
                            _tx = _mx - _mrx - $window.pageXOffset;
                            _ty = _my - _mry - $window.pageYOffset;
                        }

                        $document.on(_moveEvents, onmove);
                        $document.on(_releaseEvents, onrelease);
                        // This event is used to receive manually triggered mouse move events
                        // jqLite unfortunately only supports triggerHandler(...)
                        // See http://api.jquery.com/triggerHandler/
                        // _deregisterRootMoveListener = $rootScope.$on('draggable:_triggerHandlerMove', onmove);
                        _deregisterRootMoveListener = $rootScope.$on('draggable:_triggerHandlerMove', function (event, origEvent) {
                            onmove(origEvent);
                        });
                    }

                    function onmove(evt) {
                        if (!_dragEnabled)return;
                        evt.preventDefault();

                        if (!element.hasClass('pip-dragging')) {
                            _data = getDragData(scope);
                            element.addClass('pip-dragging');
                            $rootScope.$broadcast('draggable:start', {
                                x: _mx,
                                y: _my,
                                tx: _tx,
                                ty: _ty,
                                event: evt,
                                element: element,
                                data: _data
                            });

                            if (onDragStartCallback) {
                                scope.$apply(function () {
                                    onDragStartCallback(scope, {$data: _data, $event: evt});
                                });
                            }
                        }

                        _mx = pipDraggable.inputEvent(evt).pageX;
                        _my = pipDraggable.inputEvent(evt).pageY;

                        if (horizontalScroll || verticalScroll) {
                            dragToScroll();
                        }

                        if (_centerAnchor) {
                            _tx = _mx - (<any>element).centerX - _dragOffset.left;
                            _ty = _my - (<any>element).centerY - _dragOffset.top;
                        } else {
                            _tx = _mx - _mrx - _dragOffset.left;
                            _ty = _my - _mry - _dragOffset.top;
                        }

                        moveElement(_tx, _ty);

                        $rootScope.$broadcast('draggable:move', {
                            x: _mx,
                            y: _my,
                            tx: _tx,
                            ty: _ty,
                            event: evt,
                            element: element,
                            data: _data,
                            uid: _myid,
                            dragOffset: _dragOffset
                        });
                    }

                    function onrelease(evt) {
                        if (!_dragEnabled)
                            return;
                        evt.preventDefault();
                        $rootScope.$broadcast('draggable:end', {
                            x: _mx,
                            y: _my,
                            tx: _tx,
                            ty: _ty,
                            event: evt,
                            element: element,
                            data: _data,
                            callback: onDragComplete,
                            uid: _myid
                        });
                        element.removeClass('pip-dragging');
                        element.parent().find('.pip-drag-enter').removeClass('pip-drag-enter');
                        reset();
                        $document.off(_moveEvents, onmove);
                        $document.off(_releaseEvents, onrelease);

                        if (onDragStopCallback) {
                            scope.$apply(function () {
                                onDragStopCallback(scope, {$data: _data, $event: evt});
                            });
                        }

                        _deregisterRootMoveListener();
                    }

                    function onDragComplete(evt) {
                        if (!onDragSuccessCallback)return;

                        scope.$apply(function () {
                            onDragSuccessCallback(scope, {$data: _data, $event: evt});
                        });
                    }

                    function reset() {
                        if (allowTransform)
                            element.css({transform: '', 'z-index': '', '-webkit-transform': '', '-ms-transform': ''});
                        else {
                            element.css({'position': _elementStyle.position, top: _elementStyle.top, left: _elementStyle.left, 'z-index': '', width: _elementStyle.width});
                        }
                    }

                    function moveElement(x, y) {
                        var eWidth = element.css('width');
                        if (allowTransform) {
                            element.css({
                                transform: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ' + x + ', ' + y + ', 0, 1)',
                                'z-index': 99999,
                                '-webkit-transform': 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ' + x + ', ' + y + ', 0, 1)',
                                '-ms-transform': 'matrix(1, 0, 0, 1, ' + x + ', ' + y + ')'
                            });
                        } else {
                            element.css({
                                'left': x + 'px',
                                'top': y + 'px',
                                'position': 'fixed',
                                'z-index': 100,
                                width: eWidth
                            });
                        }
                    }

                    function dragToScroll() {
                        var scrollX = 0, scrollY = 0,
                            offset = function (element) {
                                return element.offset() || {left: 0, top: 0};
                            };

                        if (horizontalScroll) {
                            var
                                containerLeft = offset(scrollContainer).left,
                                containerWidth = scrollContainer.innerWidth(),
                                containerRight = containerLeft + containerWidth;

                            if ((_mx - containerLeft) < activationDistance) {
                                scrollX = -scrollDistance;
                            }
                            else if ((containerRight - _mx) < activationDistance) {
                                scrollX = scrollDistance;
                            }
                        }

                        if (verticalScroll) {
                            var
                                containerTop = offset(scrollContainer).top,
                                containerHeight = scrollContainer.innerHeight(),
                                containerBottom = containerTop + containerHeight;

                            if ((_my - containerTop) < activationDistance) {
                                scrollY = -scrollDistance + 30;
                            }
                            else if ((containerBottom - _my) < activationDistance) {
                                scrollY = scrollDistance - 30;
                            }
                        }
                        if (scrollX !== 0 || scrollY !== 0) {
                            var
                                containerScrollLeft = scrollContainer.scrollLeft(),
                                containerScrollTop = scrollContainer.scrollTop();

                            scrollContainer.scrollLeft(containerScrollLeft + scrollX);
                            scrollContainer.scrollTop(containerScrollTop + scrollY);
                        }

                    }
                }
            }
        });

    thisModule.directive('pipDrop', 
        function ($parse, $timeout, $window, $document, pipDraggable) {
        return {
            restrict: 'A',
            link: function (scope: any, element, attrs: any) {
                scope.value = attrs.pipDrop;
                scope.isTouching = false;

                var _lastDropTouch = null;
                var _myid = scope.$id;
                var _dropEnabled = false;

                var onDropCallback = $parse(attrs.pipDropSuccess);// || function(){};
                var onDragStartCallback = $parse(attrs.pipDragStart);
                var onDragStopCallback = $parse(attrs.pipDragStop);
                var onDragMoveCallback = $parse(attrs.pipDragMove);

                initialize();

                return;

                //----------------------

                function initialize() {
                    toggleListeners(true);
                }

                function toggleListeners(enable) {
                    // remove listeners
                    if (!enable)return;
                    // add listeners.
                    scope.$watch(attrs.pipDrop, onEnableChange);
                    scope.$on('$destroy', onDestroy);
                    scope.$on('draggable:start', onDragStart);
                    scope.$on('draggable:move', onDragMove);
                    scope.$on('draggable:end', onDragEnd);
                }

                function onDestroy(enable) {
                    toggleListeners(false);
                }

                function onEnableChange(newVal, oldVal) {
                    _dropEnabled = newVal;
                }

                function onDragStart(evt, obj) {
                    if (!_dropEnabled)return;
                    isTouching(obj.x, obj.y, obj.element);

                    if (attrs.pipDragStart) {
                        $timeout(function () {
                            onDragStartCallback(scope, {$data: obj.data, $event: obj});
                        });
                    }
                }

                function onDragMove(evt, obj) {
                    if (!_dropEnabled)return;
                    isTouching(obj.x, obj.y, obj.element);

                    if (attrs.pipDragMove) {
                        $timeout(function () {
                            onDragMoveCallback(scope, {$data: obj.data, $event: obj});
                        });
                    }
                }

                function onDragEnd(evt, obj) {
                    // don't listen to drop events if this is the element being dragged
                    // only update the styles and return
                    if (!_dropEnabled || _myid === obj.uid) {
                        updateDragStyles(false, obj.element);
                        return;
                    }

                    if (isTouching(obj.x, obj.y, obj.element)) {
                        // call the pipDraggable pipDragSuccess element callback
                        if (obj.callback) {
                            obj.callback(obj);
                        }

                        if (attrs.pipDropSuccess) {
                            $timeout(function () {
                                onDropCallback(scope, {
                                    $data: obj.data,
                                    $event: obj,
                                    $target: scope.$eval(scope.value)
                                });
                            });
                        }
                    }

                    if (attrs.pipDragStop) {
                        $timeout(function () {
                            onDragStopCallback(scope, {$data: obj.data, $event: obj});
                        });
                    }

                    updateDragStyles(false, obj.element);
                }

                function isTouching(mouseX, mouseY, dragElement) {
                    var touching = hitTest(mouseX, mouseY);
                    scope.isTouching = touching;
                    if (touching) {
                        _lastDropTouch = element;
                    }
                    updateDragStyles(touching, dragElement);
                    return touching;
                }

                function updateDragStyles(touching, dragElement) {
                    if (touching) {
                        element.addClass('pip-drag-enter');
                        dragElement.addClass('pip-drag-over');
                    } else if (_lastDropTouch == element) {
                        _lastDropTouch = null;
                        element.removeClass('pip-drag-enter');
                        dragElement.removeClass('pip-drag-over');
                    }
                };

                function hitTest(x, y) {
                    var bounds = element[0].getBoundingClientRect();
                    x -= $document[0].body.scrollLeft + $document[0].documentElement.scrollLeft;
                    y -= $document[0].body.scrollTop + $document[0].documentElement.scrollTop;
                    return x >= bounds.left
                        && x <= bounds.right
                        && y <= bounds.bottom
                        && y >= bounds.top;
                }
            }
        };
    });

    thisModule.directive('pipPreventDrag', function ($parse, $timeout) {
        return {
            restrict: 'A',
            link: function (scope: any, element, attrs: any) {
                initialize();

                return;
                //---------------------

                function initialize() {
                    element.attr('pip-draggable', 'false');
                    toggleListeners(true);
                }

                function toggleListeners(enable) {
                    // remove listeners
                    if (!enable)return;
                    // add listeners.
                    element.on('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                }

                function absorbEvent_(event) {
                    var e = event.originalEvent;
                    e.preventDefault && e.preventDefault();
                    e.stopPropagation && e.stopPropagation();
                    e.cancelBubble = true;
                    e.returnValue = false;
                    return false;
                }
            }
        };
    });

    thisModule.directive('pipCancelDrag', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.find('*').attr('pip-cancel-drag', 'pip-cancel-drag');
            }
        };
    });
}

