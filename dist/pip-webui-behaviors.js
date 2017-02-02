(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.pip || (g.pip = {})).behaviors = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
    'use strict';
    angular.module('pipBehaviors', [
        'pipFocused',
        'pipSelected',
        'pipInfiniteScroll',
        'pipUnsavedChanges',
        'pipDraggable',
        'pipShortcuts'
    ]);
})();
},{}],2:[function(require,module,exports){
(function () {
    'use strict';
    var thisModule = angular.module("pipDraggable", []);
    thisModule.service('pipDraggable', function () {
        var scope = this;
        scope.inputEvent = function (event) {
            if (angular.isDefined(event.touches)) {
                return event.touches[0];
            }
            else if (angular.isDefined(event.originalEvent) && angular.isDefined(event.originalEvent.touches)) {
                return event.originalEvent.touches[0];
            }
            return event;
        };
    });
    thisModule.directive('pipDrag', ['$rootScope', '$parse', '$document', '$window', 'pipDraggable', function ($rootScope, $parse, $document, $window, pipDraggable) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                scope.value = attrs.ngDrag;
                var LONG_PRESS = 50;
                var offset, _centerAnchor = false, _mx, _my, _tx, _ty, _mrx, _mry;
                var _hasTouch = ('ontouchstart' in window) || window.DocumentTouch;
                var _pressEvents = 'touchstart mousedown';
                var _moveEvents = 'touchmove mousemove';
                var _releaseEvents = 'touchend mouseup';
                var _dragHandle;
                var _myid = scope.$id;
                var _data = null;
                var _dragOffset = null;
                var _dragEnabled = false;
                var _pressTimer = null;
                var _elementStyle = {};
                var onDragStartCallback = $parse(attrs.pipDragStart) || null;
                var onDragStopCallback = $parse(attrs.pipDragStop) || null;
                var onDragSuccessCallback = $parse(attrs.pipDragSuccess) || null;
                var allowTransform = angular.isDefined(attrs.allowTransform) ? scope.$eval(attrs.allowTransform) : false;
                var getDragData = $parse(attrs.pipDragData);
                var verticalScroll = toBoolean(attrs.pipVerticalScroll) || true, horizontalScroll = toBoolean(attrs.pipHorizontalScroll) || true, activationDistance = parseFloat(attrs.pipActivationDistance) || 75, scrollDistance = parseFloat(attrs.pipScrollDistance) || 50, scrollParent = false, scrollContainer = angular.element(window), scrollContainerGetter = $parse(attrs.pipScrollContainer);
                var _deregisterRootMoveListener = angular.noop;
                initialize();
                return;
                function initialize() {
                    element.attr('pip-draggable', 'false');
                    var dragHandles;
                    if (element[0].querySelectorAll) {
                        dragHandles = angular.element(element[0].querySelectorAll('[pip-drag-handle]'));
                    }
                    else {
                        dragHandles = element.find('[pip-drag-handle]');
                    }
                    if (dragHandles.length) {
                        _dragHandle = dragHandles;
                    }
                    toggleListeners(true);
                    if (scrollParent) {
                        scrollContainer = angular.element(element.parent());
                    }
                    else if (attrs.pipScrollContainer) {
                        scrollContainer = angular.element(scrollContainerGetter(scope));
                    }
                    else {
                        scrollContainer = angular.element(window);
                    }
                }
                function toBoolean(value) {
                    if (value == null)
                        return false;
                    if (!value)
                        return false;
                    value = value.toString().toLowerCase();
                    return value == '1' || value == 'true';
                }
                function toggleListeners(enable) {
                    if (!enable)
                        return;
                    scope.$on('$destroy', onDestroy);
                    scope.$watch(attrs.pipDrag, onEnableChange);
                    scope.$watch(attrs.pipCenterAnchor, onCenterAnchor);
                    if (_dragHandle) {
                        _dragHandle.on(_pressEvents, onpress);
                    }
                    else {
                        element.on(_pressEvents, onpress);
                    }
                    if (!_hasTouch && element[0].nodeName.toLowerCase() == "img") {
                        element.on('mousedown', function () {
                            return false;
                        });
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
                    return (angular.isDefined(angular.element(evt.target).attr("pip-cancel-drag")));
                }
                function onpress(evt) {
                    if (!_dragEnabled)
                        return;
                    if (isClickableElement(evt)) {
                        return;
                    }
                    if (evt.type == "mousedown" && evt.button != 0) {
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
                    }
                    else {
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
                    if (!_dragEnabled)
                        return;
                    evt.preventDefault();
                    offset = element[0].getBoundingClientRect();
                    if (allowTransform)
                        _dragOffset = offset;
                    else {
                        _dragOffset = { left: document.body.scrollLeft, top: document.body.scrollTop };
                    }
                    element.centerX = element[0].offsetWidth / 2;
                    element.centerY = element[0].offsetHeight / 2;
                    _mx = pipDraggable.inputEvent(evt).pageX;
                    _my = pipDraggable.inputEvent(evt).pageY;
                    _mrx = _mx - offset.left;
                    _mry = _my - offset.top;
                    if (_centerAnchor) {
                        _tx = _mx - element.centerX - $window.pageXOffset;
                        _ty = _my - element.centerY - $window.pageYOffset;
                    }
                    else {
                        _tx = _mx - _mrx - $window.pageXOffset;
                        _ty = _my - _mry - $window.pageYOffset;
                    }
                    $document.on(_moveEvents, onmove);
                    $document.on(_releaseEvents, onrelease);
                    _deregisterRootMoveListener = $rootScope.$on('draggable:_triggerHandlerMove', function (event, origEvent) {
                        onmove(origEvent);
                    });
                }
                function onmove(evt) {
                    if (!_dragEnabled)
                        return;
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
                                onDragStartCallback(scope, { $data: _data, $event: evt });
                            });
                        }
                    }
                    _mx = pipDraggable.inputEvent(evt).pageX;
                    _my = pipDraggable.inputEvent(evt).pageY;
                    if (horizontalScroll || verticalScroll) {
                        dragToScroll();
                    }
                    if (_centerAnchor) {
                        _tx = _mx - element.centerX - _dragOffset.left;
                        _ty = _my - element.centerY - _dragOffset.top;
                    }
                    else {
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
                            onDragStopCallback(scope, { $data: _data, $event: evt });
                        });
                    }
                    _deregisterRootMoveListener();
                }
                function onDragComplete(evt) {
                    if (!onDragSuccessCallback)
                        return;
                    scope.$apply(function () {
                        onDragSuccessCallback(scope, { $data: _data, $event: evt });
                    });
                }
                function reset() {
                    if (allowTransform)
                        element.css({ transform: '', 'z-index': '', '-webkit-transform': '', '-ms-transform': '' });
                    else {
                        element.css({ 'position': _elementStyle.position, top: _elementStyle.top, left: _elementStyle.left, 'z-index': '', width: _elementStyle.width });
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
                    }
                    else {
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
                    var scrollX = 0, scrollY = 0, offset = function (element) {
                        return element.offset() || { left: 0, top: 0 };
                    };
                    if (horizontalScroll) {
                        var containerLeft = offset(scrollContainer).left, containerWidth = scrollContainer.innerWidth(), containerRight = containerLeft + containerWidth;
                        if ((_mx - containerLeft) < activationDistance) {
                            scrollX = -scrollDistance;
                        }
                        else if ((containerRight - _mx) < activationDistance) {
                            scrollX = scrollDistance;
                        }
                    }
                    if (verticalScroll) {
                        var containerTop = offset(scrollContainer).top, containerHeight = scrollContainer.innerHeight(), containerBottom = containerTop + containerHeight;
                        if ((_my - containerTop) < activationDistance) {
                            scrollY = -scrollDistance + 30;
                        }
                        else if ((containerBottom - _my) < activationDistance) {
                            scrollY = scrollDistance - 30;
                        }
                    }
                    if (scrollX !== 0 || scrollY !== 0) {
                        var containerScrollLeft = scrollContainer.scrollLeft(), containerScrollTop = scrollContainer.scrollTop();
                        scrollContainer.scrollLeft(containerScrollLeft + scrollX);
                        scrollContainer.scrollTop(containerScrollTop + scrollY);
                    }
                }
            }
        };
    }]);
    thisModule.directive('pipDrop', ['$parse', '$timeout', '$window', '$document', 'pipDraggable', function ($parse, $timeout, $window, $document, pipDraggable) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                scope.value = attrs.pipDrop;
                scope.isTouching = false;
                var _lastDropTouch = null;
                var _myid = scope.$id;
                var _dropEnabled = false;
                var onDropCallback = $parse(attrs.pipDropSuccess);
                var onDragStartCallback = $parse(attrs.pipDragStart);
                var onDragStopCallback = $parse(attrs.pipDragStop);
                var onDragMoveCallback = $parse(attrs.pipDragMove);
                initialize();
                return;
                function initialize() {
                    toggleListeners(true);
                }
                function toggleListeners(enable) {
                    if (!enable)
                        return;
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
                    if (!_dropEnabled)
                        return;
                    isTouching(obj.x, obj.y, obj.element);
                    if (attrs.pipDragStart) {
                        $timeout(function () {
                            onDragStartCallback(scope, { $data: obj.data, $event: obj });
                        });
                    }
                }
                function onDragMove(evt, obj) {
                    if (!_dropEnabled)
                        return;
                    isTouching(obj.x, obj.y, obj.element);
                    if (attrs.pipDragMove) {
                        $timeout(function () {
                            onDragMoveCallback(scope, { $data: obj.data, $event: obj });
                        });
                    }
                }
                function onDragEnd(evt, obj) {
                    if (!_dropEnabled || _myid === obj.uid) {
                        updateDragStyles(false, obj.element);
                        return;
                    }
                    if (isTouching(obj.x, obj.y, obj.element)) {
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
                            onDragStopCallback(scope, { $data: obj.data, $event: obj });
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
                    }
                    else if (_lastDropTouch == element) {
                        _lastDropTouch = null;
                        element.removeClass('pip-drag-enter');
                        dragElement.removeClass('pip-drag-over');
                    }
                }
                ;
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
    }]);
    thisModule.directive('pipPreventDrag', ['$parse', '$timeout', function ($parse, $timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                initialize();
                return;
                function initialize() {
                    element.attr('pip-draggable', 'false');
                    toggleListeners(true);
                }
                function toggleListeners(enable) {
                    if (!enable)
                        return;
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
    }]);
    thisModule.directive('pipCancelDrag', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.find('*').attr('pip-cancel-drag', 'pip-cancel-drag');
            }
        };
    });
})();
},{}],3:[function(require,module,exports){
(function () {
    'use strict';
    var thisModule = angular.module("pipFocused", []);
    thisModule.directive('pipFocused', ['$timeout', '$mdConstant', '$window', function ($timeout, $mdConstant, $window) {
        return {
            require: "?ngModel",
            link: function ($scope, $element, $attrs) {
                var controls, controlsLength, withHidden = $attrs.pipWithHidden, opacityDelta = 0.4, opacityLimit = 0.5, _color, focusedColor = $attrs.pipFocusedColor ? $attrs.pipFocusedColor : null, reInit = $attrs.pipFocusedRebind ? $attrs.pipFocusedRebind : null, focusedTabindex = $attrs.pipFocusedTabindex ? parseInt($attrs.pipFocusedTabindex) || 0 : 0, isOpacity = $attrs.pipFocusedOpacity ? toBoolean($attrs.pipFocusedOpacity) : false;
                $timeout(init);
                $element.on('keydown', keydownListener);
                if ($attrs.ngModel) {
                    $scope.$watch($attrs.ngModel, function () {
                        $timeout(init);
                    }, true);
                }
                if ($attrs.pipFocusedData) {
                    $attrs.$observe('pipFocusedData', function () {
                        $timeout(init);
                    }, true);
                }
                function toBoolean(value) {
                    if (value == null)
                        return false;
                    if (!value)
                        return false;
                    value = value.toString().toLowerCase();
                    return value == '1' || value == 'true';
                }
                ;
                function rgba(color) {
                    if (focusedColor) {
                        return focusedColor;
                    }
                    var arr = color.split("(")[1].split(")")[0].split(",");
                    if (!arr || arr.length < 3) {
                        return '';
                    }
                    var red, blue, green, opacity;
                    opacity = arr.length == 3 ? 1 : parseFloat(arr[3]);
                    red = arr[0];
                    blue = arr[1];
                    green = arr[2];
                    if (opacity < opacityLimit) {
                        opacity += opacityDelta;
                    }
                    else {
                        opacity -= opacityDelta;
                    }
                    return 'rgba(' + red + ', ' + blue + ', ' + green + ', ' + opacity + ')';
                }
                function setTabindex(element, value) {
                    element.attr('tabindex', value);
                }
                function checkTabindex(controls) {
                    var index = _.findIndex(controls, function (c) {
                        return c['tabindex'] > -1;
                    });
                    if (index == -1 && controls.length > 0) {
                        setTabindex(angular.element(controls[0]), focusedTabindex);
                    }
                }
                function init() {
                    var selector = withHidden ? '.pip-focusable' : '.pip-focusable:visible';
                    controls = $element.find(selector);
                    controlsLength = controls.length;
                    checkTabindex(controls);
                    controls.on('focus', function () {
                        if ($(this).hasClass('md-focused')) {
                            return;
                        }
                        if (reInit) {
                            init();
                        }
                        $element.addClass('pip-focused-container');
                        if (isOpacity) {
                            var ell = angular.element($(this)[0]);
                            _color = $(this).css('backgroundColor');
                            $(this).css('backgroundColor', rgba(_color));
                            $(this).addClass('md-focused');
                        }
                        else {
                            $(this).addClass('md-focused md-focused-opacity');
                        }
                    }).on('focusout', function () {
                        if (!$(this).hasClass('md-focused')) {
                            return;
                        }
                        $element.removeClass('pip-focused-container');
                        if (isOpacity) {
                            $(this).css('backgroundColor', "");
                            $(this).removeClass('md-focused md-focused-opacity');
                        }
                        else {
                            $(this).removeClass('md-focused');
                        }
                    });
                }
                function keydownListener(e) {
                    var keyCode = e.which || e.keyCode;
                    if (keyCode == $mdConstant.KEY_CODE.LEFT_ARROW ||
                        keyCode == $mdConstant.KEY_CODE.UP_ARROW ||
                        keyCode == $mdConstant.KEY_CODE.RIGHT_ARROW ||
                        keyCode == $mdConstant.KEY_CODE.DOWN_ARROW) {
                        e.preventDefault();
                        var increment = (keyCode == $mdConstant.KEY_CODE.RIGHT_ARROW || keyCode == $mdConstant.KEY_CODE.DOWN_ARROW) ? 1 : -1, moveToControl = controls.index(controls.filter(".md-focused")) + increment;
                        if (moveToControl >= 0 && moveToControl < controlsLength) {
                            controls[moveToControl].focus();
                        }
                    }
                }
            }
        };
    }]);
})();
},{}],4:[function(require,module,exports){
(function () {
    'use strict';
    var thisModule = angular.module("pipInfiniteScroll", []);
    thisModule.directive('pipInfiniteScroll', ['$rootScope', '$window', '$interval', '$parse', function ($rootScope, $window, $interval, $parse) {
        var THROTTLE_MILLISECONDS = 500;
        return {
            scope: {
                pipInfiniteScroll: '&',
                pipScrollContainer: '=',
                pipScrollDistance: '=',
                pipScrollDisabled: '=',
                pipScrollUseDocumentBottom: '=',
                pipScrollListenForEvent: '@'
            },
            link: function ($scope, $element, $attrs) {
                var checkWhenEnabled = null, scrollContainer, immediateCheck = true, scrollDistance = null, scrollEnabled = null, unregisterEventListener = null, useDocumentBottom = false, windowElement = angular.element($window);
                function height(element) {
                    element = element[0] || element;
                    if (isNaN(element.offsetHeight)) {
                        return element.document.documentElement.clientHeight;
                    }
                    else {
                        return element.offsetHeight;
                    }
                }
                ;
                function offsetTop(element) {
                    if (!element[0].getBoundingClientRect || element.css('none')) {
                        return;
                    }
                    return element[0].getBoundingClientRect().top + pageYOffset(element);
                }
                ;
                function pageYOffset(element) {
                    element = element[0] || element;
                    if (isNaN(window.pageYOffset)) {
                        return element.document.documentElement.scrollTop;
                    }
                    else {
                        return element.ownerDocument.defaultView.pageYOffset;
                    }
                }
                ;
                var onContainerScroll = function () {
                    var containerBottom, containerTopOffset, elementBottom, remaining, shouldScroll;
                    if (scrollContainer === windowElement) {
                        containerBottom = height(scrollContainer) + pageYOffset(scrollContainer[0].document.documentElement);
                        elementBottom = offsetTop($element) + height($element);
                    }
                    else {
                        containerBottom = height(scrollContainer);
                        containerTopOffset = 0;
                        if (offsetTop(scrollContainer) !== void 0) {
                            containerTopOffset = offsetTop(scrollContainer);
                        }
                        elementBottom = offsetTop($element) - containerTopOffset + height($element);
                    }
                    if (useDocumentBottom) {
                        elementBottom = height(($element[0].ownerDocument || $element[0].document).documentElement);
                    }
                    remaining = elementBottom - containerBottom;
                    shouldScroll = remaining <= height(scrollContainer) * scrollDistance + 1;
                    if (shouldScroll) {
                        checkWhenEnabled = true;
                        if (scrollEnabled) {
                            if ($scope.$$phase || $rootScope.$$phase) {
                                return $scope.pipInfiniteScroll();
                            }
                            else {
                                return $scope.$apply($scope.pipInfiniteScroll);
                            }
                        }
                    }
                    else {
                        return checkWhenEnabled = false;
                    }
                };
                if (THROTTLE_MILLISECONDS != null) {
                    onContainerScroll = _.throttle(onContainerScroll, THROTTLE_MILLISECONDS);
                }
                $scope.$on('$destroy', function () {
                    scrollContainer.unbind('scroll', onContainerScroll);
                    if (unregisterEventListener != null) {
                        unregisterEventListener();
                        return unregisterEventListener = null;
                    }
                });
                function handleScrollDistance(v) {
                    return scrollDistance = parseFloat(v) || 0;
                }
                ;
                $scope.$watch('pipScrollDistance', handleScrollDistance);
                handleScrollDistance($scope.pipScrollDistance);
                function handleScrollDisabled(v) {
                    scrollEnabled = !v;
                    if (scrollEnabled && checkWhenEnabled) {
                        checkWhenEnabled = false;
                        return onContainerScroll();
                    }
                }
                ;
                $scope.$watch('pipScrollDisabled', handleScrollDisabled);
                handleScrollDisabled($scope.pipScrollDisabled);
                function handleScrollUseDocumentBottom(v) {
                    return useDocumentBottom = v;
                }
                ;
                $scope.$watch('pipScrollUseDocumentBottom', handleScrollUseDocumentBottom);
                handleScrollUseDocumentBottom($scope.pipScrollUseDocumentBottom);
                function changeContainer(newContainer) {
                    if (scrollContainer != null) {
                        scrollContainer.unbind('scroll', onContainerScroll);
                    }
                    scrollContainer = newContainer;
                    if (newContainer != null) {
                        return scrollContainer.bind('scroll', onContainerScroll);
                    }
                }
                ;
                changeContainer(windowElement);
                if ($scope.pipScrollListenForEvent) {
                    unregisterEventListener = $rootScope.$on($scope.pipScrollListenForEvent, onContainerScroll);
                }
                function handleScrollContainer(newContainer) {
                    if ((newContainer == null) || newContainer.length === 0) {
                        return;
                    }
                    if (newContainer instanceof HTMLElement) {
                        newContainer = angular.element(newContainer);
                    }
                    else if (typeof newContainer.append === 'function') {
                        newContainer = angular.element(newContainer[newContainer.length - 1]);
                    }
                    else if (typeof newContainer === 'string') {
                        newContainer = $element.parents().find(newContainer);
                    }
                    if (newContainer != null && (!Array.isArray(newContainer) ||
                        (Array.isArray(newContainer) && newContainer.length > 0))) {
                        return changeContainer(newContainer);
                    }
                    else {
                        throw new Error("Invalid pip-scroll-container attribute.");
                    }
                }
                ;
                $scope.$watch('pipScrollContainer', function (newContainer) {
                    if (newContainer !== scrollContainer)
                        handleScrollContainer(newContainer);
                });
                handleScrollContainer($scope.pipScrollContainer || []);
                if ($attrs.pipScrollParent != null) {
                    changeContainer(angular.element($element.parent()));
                }
                if ($attrs.pipScrolImmediateCheck != null) {
                    immediateCheck = $scope.$eval($attrs.pipScrolImmediateCheck);
                }
                return $interval((function () {
                    if (immediateCheck) {
                        return onContainerScroll();
                    }
                }), 0, 1);
            }
        };
    }]);
})();
},{}],5:[function(require,module,exports){
'use strict';
var ShortcutOption = (function () {
    function ShortcutOption() {
    }
    return ShortcutOption;
}());
exports.ShortcutOption = ShortcutOption;
var KeyboardEvent = (function () {
    function KeyboardEvent() {
    }
    return KeyboardEvent;
}());
KeyboardEvent.Keydown = 'keydown';
KeyboardEvent.Keyup = 'keyup';
KeyboardEvent.Keypress = 'keypress';
exports.KeyboardEvent = KeyboardEvent;
var KeyboardShortcut = (function () {
    KeyboardShortcut.$inject = ['element', 'shorcutCombination', 'option', 'callback'];
    function KeyboardShortcut(element, shorcutCombination, option, callback) {
        "ngInject";
        var _this = this;
        this.shift_nums = {
            "`": "~",
            "1": "!",
            "2": "@",
            "3": "#",
            "4": "$",
            "5": "%",
            "6": "^",
            "7": "&",
            "8": "*",
            "9": "(",
            "0": ")",
            "-": "_",
            "=": "+",
            ";": ":",
            "'": "\"",
            ",": "<",
            ".": ">",
            "/": "?",
            "\\": "|"
        };
        this.special_keys = {
            'esc': 27,
            'escape': 27,
            'tab': 9,
            'space': 32,
            'return': 13,
            'enter': 13,
            'backspace': 8,
            'scrolllock': 145,
            'scroll_lock': 145,
            'scroll': 145,
            'capslock': 20,
            'caps_lock': 20,
            'caps': 20,
            'numlock': 144,
            'num_lock': 144,
            'num': 144,
            'pause': 19,
            'break': 19,
            'insert': 45,
            'home': 36,
            'delete': 46,
            'end': 35,
            'pageup': 33,
            'page_up': 33,
            'pu': 33,
            'pagedown': 34,
            'page_down': 34,
            'pd': 34,
            'left': 37,
            'up': 38,
            'right': 39,
            'down': 40,
            'f1': 112,
            'f2': 113,
            'f3': 114,
            'f4': 115,
            'f5': 116,
            'f6': 117,
            'f7': 118,
            'f8': 119,
            'f9': 120,
            'f10': 121,
            'f11': 122,
            'f12': 123
        };
        this.modifiers = {
            shift: { wanted: false, pressed: false },
            ctrl: { wanted: false, pressed: false },
            alt: { wanted: false, pressed: false },
            meta: { wanted: false, pressed: false }
        };
        this.target = element;
        this.shorcut = shorcutCombination;
        this.event = option.Type;
        this.option = option;
        this.callback = callback;
        this.eventCallback = function (event) {
            console.log('eventCallback', _this.shorcut);
            var e = event || window.event;
            var code;
            if (_this.option.DisableInInput) {
                var element_1;
                if (e.target) {
                    element_1 = e.target;
                }
                else if (e.srcElement) {
                    element_1 = e.srcElement;
                }
                if (element_1.nodeType == 3) {
                    element_1 = element_1.parentNode;
                }
                if (element_1.tagName == 'INPUT' || element_1.tagName == 'TEXTAREA')
                    return;
            }
            if (e.keyCode) {
                code = e.keyCode;
            }
            else if (e.which) {
                code = e.which;
            }
            var character = String.fromCharCode(code).toLowerCase();
            if (code == 188)
                character = ",";
            if (code == 190)
                character = ".";
            var keys = _this.shorcut.split("+");
            var kp = 0;
            if (e.ctrlKey)
                _this.modifiers.ctrl.pressed = e.ctrlKey;
            if (e.shiftKey)
                _this.modifiers.shift.pressed = e.shiftKey;
            if (e.altKey)
                _this.modifiers.alt.pressed = e.altKey;
            if (e.metaKey)
                _this.modifiers.meta.pressed = e.metaKey;
            var i = 0;
            for (i = 0; i < keys.length; i++) {
                var k = keys[i];
                if (k == 'ctrl' || k == 'control') {
                    kp++;
                    _this.modifiers.ctrl.wanted = true;
                }
                else if (k == 'shift') {
                    kp++;
                    _this.modifiers.shift.wanted = true;
                }
                else if (k == 'alt') {
                    kp++;
                    _this.modifiers.alt.wanted = true;
                }
                else if (k == 'meta') {
                    kp++;
                    _this.modifiers.meta.wanted = true;
                }
                else if (k.length > 1) {
                    if (_this.special_keys[k] == code) {
                        kp++;
                    }
                }
                else if (_this.option.Keycode) {
                    if (_this.option.Keycode == code)
                        kp++;
                }
                else {
                    if (character == k)
                        kp++;
                    else {
                        if (_this.shift_nums[character] && e.shiftKey) {
                            character = _this.shift_nums[character];
                            if (character == k) {
                                kp++;
                            }
                        }
                    }
                }
            }
            if (kp == keys.length &&
                _this.modifiers.ctrl.pressed == _this.modifiers.ctrl.wanted &&
                _this.modifiers.shift.pressed == _this.modifiers.shift.wanted &&
                _this.modifiers.alt.pressed == _this.modifiers.alt.wanted &&
                _this.modifiers.meta.pressed == _this.modifiers.meta.wanted) {
                console.log('callback', _this.shorcut, callback);
                _this.callback(e);
                if (!_this.option.Propagate) {
                    e.cancelBubble = true;
                    e.returnValue = false;
                    if (e.stopPropagation) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                    return false;
                }
            }
            _this.modifiers.ctrl.pressed = false;
            _this.modifiers.shift.pressed = false;
            _this.modifiers.alt.pressed = false;
            _this.modifiers.meta.pressed = false;
        };
    }
    return KeyboardShortcut;
}());
exports.KeyboardShortcut = KeyboardShortcut;
},{}],6:[function(require,module,exports){
'use strict';
var KeyboardShortcut_1 = require("./KeyboardShortcut");
var ShortcutsRegister = (function () {
    ShortcutsRegister.$inject = ['$log', 'option'];
    function ShortcutsRegister($log, option) {
        "ngInject";
        this._log = $log;
        this._defaultOption = option ? _.defaults(option, this.getDefaultOption()) : this.getDefaultOption();
        this._shortcuts = {};
    }
    ShortcutsRegister.prototype.getDefaultOption = function () {
        var defaultOption = {
            Type: KeyboardShortcut_1.KeyboardEvent.Keydown,
            Propagate: false,
            DisableInInput: false,
            Target: document,
            Keycode: null
        };
        return defaultOption;
    };
    ShortcutsRegister.prototype.checkAddShortcut = function (element, shorcutCombination, callback) {
        if (!element) {
            return false;
        }
        if (!shorcutCombination) {
            return false;
        }
        if (!callback) {
            return false;
        }
        return true;
    };
    Object.defineProperty(ShortcutsRegister.prototype, "shorcuts", {
        get: function () {
            return this._shortcuts;
        },
        enumerable: true,
        configurable: true
    });
    ShortcutsRegister.prototype.add = function (shorcutName, callback, option) {
        console.log('add', shorcutName, callback, option);
        var shorcutOption = option ? _.defaults(option, this._defaultOption) : this._defaultOption;
        var shorcutCombination = shorcutName.toLowerCase();
        var element = shorcutOption.Target;
        if (typeof shorcutOption.Target == 'string') {
            element = document.getElementById(shorcutOption.Target);
        }
        else {
            element = shorcutOption.Target;
        }
        if (!this.checkAddShortcut(element, shorcutCombination, callback)) {
            return;
        }
        var newKeyboardShortcut = new KeyboardShortcut_1.KeyboardShortcut(element, shorcutCombination, shorcutOption, callback);
        this._shortcuts[shorcutCombination] = newKeyboardShortcut;
        if (element.addEventListener) {
            element.addEventListener(shorcutOption.Type, newKeyboardShortcut.eventCallback, false);
        }
        else if (element.attachEvent) {
            element.attachEvent('on' + shorcutOption.Type, newKeyboardShortcut.eventCallback);
        }
        else {
            element.on(shorcutOption.Type, newKeyboardShortcut.eventCallback);
        }
    };
    ShortcutsRegister.prototype.remove = function (shorcutName) {
        var shortcutCombination = shorcutName.toLowerCase();
        var binding = this._shortcuts[shortcutCombination];
        console.log('remove', shorcutName, this._shortcuts[shortcutCombination]);
        delete (this._shortcuts[shortcutCombination]);
        if (!binding)
            return;
        var type = binding.event;
        var element = binding.target;
        var callback = binding.eventCallback;
        if (element.detachEvent) {
            element.detachEvent('on' + type, callback);
        }
        else if (element.removeEventListener) {
            element.removeEventListener(type, callback, false);
        }
        else {
            element.off(type, callback);
        }
        console.log('remove1', shorcutName, this._shortcuts[shortcutCombination]);
    };
    return ShortcutsRegister;
}());
exports.ShortcutsRegister = ShortcutsRegister;
var ShortcutsRegisterProvider = (function () {
    function ShortcutsRegisterProvider() {
    }
    Object.defineProperty(ShortcutsRegisterProvider.prototype, "option", {
        get: function () {
            return this._option;
        },
        set: function (value) {
            this._option = value || new KeyboardShortcut_1.ShortcutOption();
        },
        enumerable: true,
        configurable: true
    });
    ShortcutsRegisterProvider.prototype.$get = ['$log', function ($log) {
        "ngInject";
        if (this._service == null)
            this._service = new ShortcutsRegister($log, this._option);
        return this._service;
    }];
    return ShortcutsRegisterProvider;
}());
angular
    .module('pipShortcuts')
    .provider('pipShortcutsRegister', ShortcutsRegisterProvider);
},{"./KeyboardShortcut":5}],7:[function(require,module,exports){
'use strict';
var ShortcutController = (function () {
    ShortcutController.$inject = ['$element', '$attrs', '$scope', '$log', '$parse', '$timeout', 'pipShortcutsRegister'];
    function ShortcutController($element, $attrs, $scope, $log, $parse, $timeout, pipShortcutsRegister) {
        "ngInject";
        var _this = this;
        this._log = $log;
        if ($attrs.pipShortcutAction) {
            console.log('$attrs.pipShortcutAction');
            this.actionShortcuts = $parse($attrs.pipShortcutAction);
            var a1 = $attrs.pipShortcutAction;
            this.actionShortcuts($scope, { $event: {} });
            console.log('$attrs.pipShortcutAction', a1);
        }
        else {
            this._log.error('Shorcunt action does not set.');
            return;
        }
        if ($attrs.pipShortcutName && _.isString($attrs.pipShortcutName)) {
            this.nameShortcuts = $attrs.pipShortcutName;
        }
        else {
            this._log.error('Shorcunt name does not set.');
            return;
        }
        this.options = $attrs.pipShorcutOptions ? $attrs.pipShorcutOptions : {};
        this.options.Target = $element;
        pipShortcutsRegister.add(this.nameShortcuts, function (e) {
            _this.actionShortcuts($scope, { $event: { 'e': e } });
        }, this.options);
        $timeout(function () {
            pipShortcutsRegister.remove(_this.nameShortcuts);
            console.log('shortcut removed');
        }, 100000);
    }
    ShortcutController.prototype.keypressShortcut = function (action) {
        this.actionShortcuts();
    };
    return ShortcutController;
}());
(function () {
    shortcutsDirective.$inject = ['$parse'];
    function shortcutsDirective($parse) {
        return {
            restrict: 'A',
            scope: false,
            controller: ShortcutController
        };
    }
    angular
        .module('pipShortcuts')
        .directive('pipShortcut', shortcutsDirective);
})();
},{}],8:[function(require,module,exports){
'use strict';
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
exports.ShortcutsChangedEvent = 'pipShortcutsChanged';
var SimpleShortcutItem = (function () {
    function SimpleShortcutItem() {
    }
    return SimpleShortcutItem;
}());
exports.SimpleShortcutItem = SimpleShortcutItem;
var ShortcutItem = (function (_super) {
    __extends(ShortcutItem, _super);
    function ShortcutItem() {
        return _super.apply(this, arguments) || this;
    }
    return ShortcutItem;
}(SimpleShortcutItem));
exports.ShortcutItem = ShortcutItem;
var ShortcutsConfig = (function () {
    function ShortcutsConfig() {
        this.globalShortcuts = [];
        this.localShortcuts = [];
        this.defaultOptions = null;
    }
    return ShortcutsConfig;
}());
exports.ShortcutsConfig = ShortcutsConfig;
var ShortcutsService = (function () {
    function ShortcutsService(config, $rootScope, $window, $location, $injector, pipShortcutsRegister) {
        this._config = config;
        this._oldConfig = _.cloneDeep(this._config);
        this._rootScope = $rootScope;
        this._window = $window;
        this._location = $location;
        this._injector = $injector;
        this._pipShortcutsRegister = pipShortcutsRegister;
        console.log('ShortcutsService this._oldConfig', this._oldConfig);
        this.addShortcuts(this._config.globalShortcuts);
        this.addShortcuts(this._config.localShortcuts);
    }
    ShortcutsService.prototype.sendChangeEvent = function () {
        this.removeShortcuts(this._oldConfig.globalShortcuts);
        this.removeShortcuts(this._oldConfig.localShortcuts);
        this.addShortcuts(this._config.globalShortcuts);
        this.addShortcuts(this._config.localShortcuts);
        this._rootScope.$emit(exports.ShortcutsChangedEvent, this._config);
        this._oldConfig = _.cloneDeep(this._config);
    };
    ShortcutsService.prototype.removeShortcuts = function (collection) {
        var _this = this;
        _.each(collection, function (k) {
            _this._pipShortcutsRegister.remove(k.shortcut);
        });
    };
    ShortcutsService.prototype.keypressShortcut = function (shorcut, event) {
        if (shorcut.access && _.isFunction(shorcut.access)) {
            if (!shorcut.access(event)) {
                return;
            }
        }
        if (shorcut.keypress) {
            shorcut.keypress(event);
            return;
        }
        if (shorcut.href) {
            this._window.location.href = shorcut.href;
            return;
        }
        if (shorcut.url) {
            this._location.url(shorcut.url);
            return;
        }
        if (shorcut.state) {
            if (this._injector.has('$state')) {
                var $state = this._injector.get('$state');
                $state['go'](shorcut.state, shorcut.stateParams);
            }
            return;
        }
        if (shorcut.event) {
            this._rootScope.$broadcast(shorcut.event);
        }
        else {
            this._rootScope.$broadcast('pipShortcutKeypress', shorcut.shortcut);
        }
    };
    ShortcutsService.prototype.addShortcuts = function (collection) {
        var _this = this;
        var generalOptions = this._config.defaultOptions ? this._config.defaultOptions : {};
        _.each(collection, function (k) {
            var option = k.options ? k.options : generalOptions;
            var target;
            target = k.target ? k.target : k.targetId;
            option.Target = target;
            _this._pipShortcutsRegister.add(k.shortcut, function (e) {
                _this.keypressShortcut(k, e);
            }, option);
        });
    };
    Object.defineProperty(ShortcutsService.prototype, "config", {
        get: function () {
            return this._config;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ShortcutsService.prototype, "defaultOptions", {
        get: function () {
            return this._config.defaultOptions;
        },
        set: function (value) {
            this._config.defaultOptions = value || null;
            this.sendChangeEvent();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ShortcutsService.prototype, "globalShortcuts", {
        get: function () {
            return this._config.globalShortcuts;
        },
        set: function (value) {
            this._config.globalShortcuts = value || [];
            this.sendChangeEvent();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ShortcutsService.prototype, "localShortcuts", {
        get: function () {
            return this._config.localShortcuts;
        },
        set: function (value) {
            this._config.localShortcuts = value || [];
            this.sendChangeEvent();
        },
        enumerable: true,
        configurable: true
    });
    ShortcutsService.prototype.on = function (globalShortcuts, localShortcuts) {
        if (globalShortcuts && _.isArray(globalShortcuts)) {
            this._config.globalShortcuts = globalShortcuts;
        }
        if (localShortcuts && _.isArray(localShortcuts)) {
            this._config.localShortcuts = localShortcuts;
        }
        this.sendChangeEvent();
    };
    ShortcutsService.prototype.off = function () {
        this._config.globalShortcuts = [];
        this._config.localShortcuts = [];
        this.sendChangeEvent();
    };
    return ShortcutsService;
}());
var ShortcutsProvider = (function () {
    function ShortcutsProvider() {
        this._config = new ShortcutsConfig();
    }
    Object.defineProperty(ShortcutsProvider.prototype, "config", {
        get: function () {
            return this._config;
        },
        set: function (value) {
            this._config = value || new ShortcutsConfig();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ShortcutsProvider.prototype, "defaultOptions", {
        get: function () {
            return this._config.defaultOptions;
        },
        set: function (value) {
            this._config.defaultOptions = value || null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ShortcutsProvider.prototype, "globalShortcuts", {
        get: function () {
            return this._config.globalShortcuts;
        },
        set: function (value) {
            this._config.globalShortcuts = value || [];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ShortcutsProvider.prototype, "localShortcuts", {
        get: function () {
            return this._config.localShortcuts;
        },
        set: function (value) {
            this._config.localShortcuts = value || [];
        },
        enumerable: true,
        configurable: true
    });
    ShortcutsProvider.prototype.$get = ['$rootScope', '$window', '$location', '$injector', 'pipShortcutsRegister', function ($rootScope, $window, $location, $injector, pipShortcutsRegister) {
        "ngInject";
        if (this._service == null)
            this._service = new ShortcutsService(this._config, $rootScope, $window, $location, $injector, pipShortcutsRegister);
        return this._service;
    }];
    return ShortcutsProvider;
}());
angular
    .module('pipShortcuts')
    .provider('pipShortcuts', ShortcutsProvider);
},{}],9:[function(require,module,exports){
'use strict';
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
angular.module('pipShortcuts', ['ngMaterial', 'ui.router']);
require("./ShorcutsRegisterService");
require("./ShortcutsService");
require("./ShortcutDirective");
__export(require("./ShortcutsService"));
__export(require("./ShorcutsRegisterService"));
},{"./ShorcutsRegisterService":6,"./ShortcutDirective":7,"./ShortcutsService":8}],10:[function(require,module,exports){
(function () {
    'use strict';
    var thisModule = angular.module("pipSelected", []);
    thisModule.directive('pipSelected', ['$parse', '$mdConstant', '$timeout', function ($parse, $mdConstant, $timeout) {
        return {
            restrict: 'A',
            scope: false,
            link: function ($scope, $element, $attrs) {
                var indexGetter = $attrs.pipSelected ? $parse($attrs.pipSelected) : null, indexSetter = indexGetter ? indexGetter.assign : null, idGetter = $attrs.pipSelectedId ? $parse($attrs.pipSelectedId) : null, idSetter = idGetter ? idGetter.assign : null, changeGetter = $attrs.pipSelect ? $parse($attrs.pipSelect) : null, enterSpaceGetter = $attrs.pipEnterSpacePress ? $parse($attrs.pipEnterSpacePress) : null, noScroll = toBoolean($attrs.pipNoScroll), modifier = toBoolean($attrs.pipSkipHidden) ? ':visible' : '', className = toBoolean($attrs.pipTreeList) ? '.pip-selectable-tree' : '.pip-selectable', selectedIndex = indexGetter($scope), currentElementTabinex = $element.attr('tabindex'), pipSelectedWatch = $attrs.pipSelectedWatch, isScrolled = false;
                var touchStartX, touchStartY, trackingClick, trackingClickStart, targetElement, lastClickTime, cancelNextClick;
                var touchBoundary = 10, tapdelay = 200, tapTimeout = 700;
                $element.attr('tabindex', currentElementTabinex || 0);
                $element.on('click', className, onClickEvent);
                $element.on('touchstart', className, onTouchStart);
                $element.on('touchmove', className, onTouchMove);
                $element.on('touchend', className, onTouchEnd);
                $element.on('touchcancel', className, onTouchCancel);
                $element.on('keydown', onKeyDown);
                $element.on('focusin', onFocusIn);
                $element.on('focusout', onFocusOut);
                if (!toBoolean($attrs.pipTreeList)) {
                    $scope.$watch(indexGetter, function (newSelectedIndex) {
                        selectItem({ itemIndex: newSelectedIndex });
                    });
                }
                else {
                    $scope.$watch(idGetter, function (newSelectedId) {
                        setTimeout(function () {
                            selectItem({ itemId: newSelectedId, raiseEvent: true });
                        }, 0);
                    });
                }
                if (pipSelectedWatch) {
                    $scope.$watch(pipSelectedWatch, function () {
                        setTimeout(function () {
                            selectedIndex = indexGetter($scope);
                            selectItem({ itemIndex: selectedIndex });
                        }, 100);
                    });
                }
                selectItem({ itemIndex: selectedIndex, items: $element.find(className) });
                function toBoolean(value) {
                    if (value == null)
                        return false;
                    if (!value)
                        return false;
                    value = value.toString().toLowerCase();
                    return value == '1' || value == 'true';
                }
                ;
                function selectItem(itemParams) {
                    if (isScrolled)
                        return;
                    var itemIndex = itemParams.itemIndex, itemId = itemParams.itemId, items = itemParams.items || $element.find(className + modifier), itemsLength = items.length, item = (function () {
                        if (itemParams.item)
                            return itemParams.item;
                        if (itemIndex === undefined && itemIndex === -1) {
                            itemIndex = items.index(items.filter('[pip-id=' + itemId + ']'));
                        }
                        if (itemIndex >= 0 && itemIndex < itemsLength) {
                            return items[itemIndex];
                        }
                    }()), raiseEvent = itemParams.raiseEvent;
                    if (item) {
                        $element.find(className).removeClass('selected md-focused');
                        item = angular.element(item)
                            .addClass('selected md-focused')
                            .focus();
                        if (!noScroll)
                            scrollToItem(item);
                        if (raiseEvent)
                            defineSelectedIndex(items);
                    }
                }
                ;
                function defineSelectedIndex(items) {
                    var oldSelectedIndex = selectedIndex;
                    selectedIndex = -1;
                    for (var index = 0; index < items.length; index++) {
                        if ($(items[index]).hasClass('selected')) {
                            selectedIndex = index;
                            break;
                        }
                    }
                    if (oldSelectedIndex != selectedIndex && selectedIndex !== -1) {
                        $scope.$apply(updateIndex);
                    }
                    else {
                        $scope.$apply(onSelect);
                    }
                    function updateIndex() {
                        var selectedItem = angular.element(items[selectedIndex]), selectedId = selectedItem.attr('pip-id');
                        if (indexSetter)
                            indexSetter($scope, selectedIndex);
                        if (idSetter)
                            idSetter($scope, selectedId);
                        onSelect();
                    }
                    ;
                    function onSelect() {
                        var selectedItem = angular.element(items[selectedIndex]), selectedId = selectedItem.attr('pip-id');
                        if (changeGetter) {
                            changeGetter($scope, {
                                $event: {
                                    target: $element,
                                    item: selectedItem,
                                    index: selectedIndex,
                                    id: selectedId,
                                    newIndex: selectedIndex,
                                    oldIndex: oldSelectedIndex
                                }
                            });
                        }
                    }
                }
                ;
                function scrollToItem($item) {
                    if (noScroll)
                        return;
                    var containerTop = $element.offset().top, containerHeight = $element.height(), containerBottom = containerTop + containerHeight, itemTop = $item.offset().top, itemHeight = $item.outerHeight(true), itemBottom = itemTop + itemHeight, containerScrollTop = $element.scrollTop();
                    isScrolled = true;
                    setTimeout(function () {
                        isScrolled = false;
                    }, 100);
                    if (containerTop > itemTop) {
                        $element.scrollTop(containerScrollTop + itemTop - containerTop);
                    }
                    else if (containerBottom < itemBottom) {
                        $element.scrollTop(containerScrollTop + itemBottom - containerBottom);
                    }
                }
                ;
                function getTargetElementFromEventTarget(eventTarget) {
                    if (eventTarget.nodeType === Node.TEXT_NODE) {
                        return eventTarget.parentNode;
                    }
                    return eventTarget;
                }
                ;
                function touchHasMoved(event) {
                    var touch = event.changedTouches[0], boundary = touchBoundary;
                    if (Math.abs(touch.pageX - touchStartX) > boundary || Math.abs(touch.pageY - touchStartY) > boundary) {
                        return true;
                    }
                    return false;
                }
                ;
                function onClickEvent(event) {
                    selectItem({ item: event.currentTarget, raiseEvent: true });
                }
                function onTouchStart(ev) {
                    var event = ev.originalEvent;
                    if (event['targetTouches'].length > 1) {
                        return true;
                    }
                    var targetElement = getTargetElementFromEventTarget(event.target);
                    var touch = event['targetTouches'][0];
                    trackingClick = true;
                    trackingClickStart = event.timeStamp;
                    targetElement = targetElement;
                    touchStartX = touch.pageX;
                    touchStartY = touch.pageY;
                    if ((event.timeStamp - lastClickTime) < tapdelay) {
                    }
                    return true;
                }
                function onTouchMove(ev) {
                    if (!trackingClick) {
                        return true;
                    }
                    var event = ev.originalEvent;
                    if (targetElement !== getTargetElementFromEventTarget(event.target) || touchHasMoved(event)) {
                        trackingClick = false;
                        targetElement = null;
                    }
                    return true;
                }
                function onTouchEnd(ev) {
                    var forElement, newTrackingClickStart, targetTagName, scrollParent, touch, newtargetElement = targetElement;
                    if (!trackingClick) {
                        return true;
                    }
                    event = ev.originalEvent;
                    if ((event.timeStamp - lastClickTime) < tapdelay) {
                        cancelNextClick = true;
                        return true;
                    }
                    if ((event.timeStamp - trackingClickStart) > tapTimeout) {
                        return true;
                    }
                    cancelNextClick = false;
                    lastClickTime = event.timeStamp;
                    newTrackingClickStart = trackingClickStart;
                    trackingClick = false;
                    trackingClickStart = 0;
                    selectItem({ item: ev.currentTarget, raiseEvent: true });
                    return false;
                }
                function onTouchCancel(ev) {
                    trackingClick = false;
                    targetElement = null;
                }
                function onKeyDown(e) {
                    var keyCode = e.which || e.keyCode;
                    if (keyCode == $mdConstant.KEY_CODE.ENTER || keyCode == $mdConstant.KEY_CODE.SPACE) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (enterSpaceGetter) {
                            enterSpaceGetter($scope, {
                                $event: {
                                    target: $element,
                                    index: selectedIndex,
                                    item: $element.find('.selected')
                                }
                            });
                        }
                    }
                    else if (keyCode == $mdConstant.KEY_CODE.LEFT_ARROW || keyCode == $mdConstant.KEY_CODE.RIGHT_ARROW ||
                        keyCode == $mdConstant.KEY_CODE.UP_ARROW || keyCode == $mdConstant.KEY_CODE.DOWN_ARROW) {
                        e.preventDefault();
                        e.stopPropagation();
                        var items = $element.find(className + modifier), inc = (keyCode == $mdConstant.KEY_CODE.RIGHT_ARROW || keyCode == $mdConstant.KEY_CODE.DOWN_ARROW) ? 1 : -1, newSelectedIndex = selectedIndex + inc;
                        selectItem({ itemIndex: newSelectedIndex, items: items, raiseEvent: true });
                    }
                }
                function onFocusIn(event) {
                    var items, selectedItem = $element.find(className + '.selected');
                    selectedItem.addClass('md-focused');
                    if (selectedItem.length === 0) {
                        selectedIndex = indexGetter($scope);
                        items = $element.find(className + modifier);
                        selectItem({ itemIndex: selectedIndex || 0, items: items, raiseEvent: true });
                    }
                }
                function onFocusOut(event) {
                    $element.find(className + '.md-focused' + modifier).removeClass('md-focused');
                }
            }
        };
    }]);
})();
},{}],11:[function(require,module,exports){
(function () {
    'use strict';
    var thisModule = angular.module("pipUnsavedChanges", []);
    thisModule.directive("pipUnsavedChanges", ['$window', '$rootScope', function ($window, $rootScope) {
        return {
            restrict: 'AE',
            scope: {
                unsavedChangesAvailable: '&pipUnsavedChangesAvailable',
                unsavedChangesMessage: '@pipUnsavedChangesMessage',
                afterLeave: '&pipUnsavedChangesAfterLeave',
                cancelLeave: '&pipUnsavedChangesCancelLeave'
            },
            link: function ($scope) {
                $window.onbeforeunload = function () {
                    if ($scope.unsavedChangesAvailable()) {
                        $rootScope.$routing = false;
                        return $scope.unsavedChangesMessage;
                    }
                };
                var unbindFunc = $scope.$on('$stateChangeStart', function (event) {
                    if ($scope.unsavedChangesAvailable() && !$window.confirm($scope.unsavedChangesMessage)) {
                        $rootScope.$routing = false;
                        _.isFunction($scope.cancelLeave) && $scope.cancelLeave();
                        event.preventDefault();
                    }
                    else {
                        _.isFunction($scope.afterLeave) && $scope.afterLeave();
                    }
                });
                $scope.$on('$destroy', function () {
                    $window.onbeforeunload = null;
                    unbindFunc();
                });
            }
        };
    }]);
})();
},{}]},{},[1,2,3,4,9,5,6,7,8,10,11])(11)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmVoYXZpb3JzLnRzIiwic3JjL2RyYWdnYWJsZS9kcmFnZ2FibGUudHMiLCJzcmMvZm9jdXNlZC9mb2N1c2VkLnRzIiwic3JjL2luZmluaXRlX3Njcm9sbC9pbmZpbml0ZV9zY3JvbGwudHMiLCJzcmMva2V5Ym9hcmRfc2hvcnRjdXRzL0tleWJvYXJkU2hvcnRjdXQudHMiLCJzcmMva2V5Ym9hcmRfc2hvcnRjdXRzL1Nob3JjdXRzUmVnaXN0ZXJTZXJ2aWNlLnRzIiwic3JjL2tleWJvYXJkX3Nob3J0Y3V0cy9TaG9ydGN1dERpcmVjdGl2ZS50cyIsInNyYy9rZXlib2FyZF9zaG9ydGN1dHMvU2hvcnRjdXRzU2VydmljZS50cyIsInNyYy9rZXlib2FyZF9zaG9ydGN1dHMvaW5kZXgudHMiLCJzcmMvc2VsZWN0ZWQvc2VsZWN0ZWQudHMiLCJzcmMvdW5zYXZlZF9jaGFuZ2VzL3Vuc2F2ZWRfY2hhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ09BLENBQUM7SUFDRyxZQUFZLENBQUM7SUFFYixPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtRQUMzQixZQUFZO1FBQ1osYUFBYTtRQUNiLG1CQUFtQjtRQUNuQixtQkFBbUI7UUFDbkIsY0FBYztRQUNkLGNBQWM7S0FDakIsQ0FBQyxDQUFDO0FBRVAsQ0FBQyxDQUFDLEVBQUUsQ0FBQzs7QUNqQkwsQ0FBQztJQUNHLFlBQVksQ0FBQztJQUViLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRXBELFVBQVUsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFO1FBRS9CLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQztRQUNqQixLQUFLLENBQUMsVUFBVSxHQUFHLFVBQVUsS0FBSztZQUM5QixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVCLENBQUM7WUFFRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEcsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFDLENBQUM7WUFDRCxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2pCLENBQUMsQ0FBQztJQUVOLENBQUMsQ0FBQyxDQUFDO0lBRUgsVUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQzFCLFVBQVUsVUFBVSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFlBQVk7UUFDMUQsTUFBTSxDQUFDO1lBRUgsUUFBUSxFQUFFLEdBQUc7WUFDYixJQUFJLEVBQUUsVUFBVSxLQUFVLEVBQUUsT0FBTyxFQUFFLEtBQVU7Z0JBQzNDLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztnQkFDM0IsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDO2dCQUNwQixJQUFJLE1BQU0sRUFBRSxhQUFhLEdBQUcsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO2dCQUNsRSxJQUFJLFNBQVMsR0FBRyxDQUFDLGNBQWMsSUFBSSxNQUFNLENBQUMsSUFBVSxNQUFPLENBQUMsYUFBYSxDQUFDO2dCQUMxRSxJQUFJLFlBQVksR0FBRyxzQkFBc0IsQ0FBQztnQkFDMUMsSUFBSSxXQUFXLEdBQUcscUJBQXFCLENBQUM7Z0JBQ3hDLElBQUksY0FBYyxHQUFHLGtCQUFrQixDQUFDO2dCQUN4QyxJQUFJLFdBQVcsQ0FBQztnQkFHaEIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztnQkFDdEIsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO2dCQUVqQixJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUM7Z0JBRXZCLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQztnQkFFekIsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDO2dCQUV2QixJQUFJLGFBQWEsR0FBUSxFQUFFLENBQUM7Z0JBRTVCLElBQUksbUJBQW1CLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUM7Z0JBQzdELElBQUksa0JBQWtCLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUM7Z0JBQzNELElBQUkscUJBQXFCLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxJQUFJLENBQUM7Z0JBQ2pFLElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLEtBQUssQ0FBQztnQkFFekcsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDNUMsSUFDSSxjQUFjLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLElBQUksRUFDM0QsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLElBQUksRUFDL0Qsa0JBQWtCLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsRUFDbEUsY0FBYyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEVBQzFELFlBQVksR0FBRyxLQUFLLEVBRXBCLGVBQWUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUN6QyxxQkFBcUIsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBRzdELElBQUksMkJBQTJCLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFFL0MsVUFBVSxFQUFFLENBQUM7Z0JBRWIsTUFBTSxDQUFDO2dCQUlQO29CQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUl2QyxJQUFJLFdBQWdCLENBQUM7b0JBQ3JCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7d0JBQzlCLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7b0JBQ3BGLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztvQkFDcEQsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDckIsV0FBVyxHQUFHLFdBQVcsQ0FBQztvQkFDOUIsQ0FBQztvQkFDRCxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBR3RCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7d0JBQ2YsZUFBZSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7b0JBQ3hELENBQUM7b0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7d0JBQ2xDLGVBQWUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ3BFLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osZUFBZSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzlDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxtQkFBbUIsS0FBSztvQkFDcEIsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQzt3QkFBQyxNQUFNLENBQUMsS0FBSyxDQUFDO29CQUNoQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQzt3QkFBQyxNQUFNLENBQUMsS0FBSyxDQUFDO29CQUN6QixLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUN2QyxNQUFNLENBQUMsS0FBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLElBQUksTUFBTSxDQUFDO2dCQUMzQyxDQUFDO2dCQUVELHlCQUF5QixNQUFNO29CQUMzQixFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQzt3QkFBQSxNQUFNLENBQUM7b0JBR25CLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUNqQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7b0JBQzVDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztvQkFFcEQsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzt3QkFFZCxXQUFXLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDMUMsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFFSixPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDdEMsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQzNELE9BQU8sQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFOzRCQUNwQixNQUFNLENBQUMsS0FBSyxDQUFDO3dCQUNqQixDQUFDLENBQUMsQ0FBQztvQkFDUCxDQUFDO2dCQUNMLENBQUM7Z0JBRUQsbUJBQW1CLE1BQU07b0JBQ3JCLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDM0IsQ0FBQztnQkFFRCx3QkFBd0IsTUFBTSxFQUFFLE1BQU07b0JBQ2xDLFlBQVksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM1QixDQUFDO2dCQUVELHdCQUF3QixNQUFNLEVBQUUsTUFBTTtvQkFDbEMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDMUIsYUFBYSxHQUFHLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxDQUFDO2dCQUMzQyxDQUFDO2dCQUVELDRCQUE0QixHQUFHO29CQUMzQixNQUFNLENBQUMsQ0FDSCxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQ3pFLENBQUM7Z0JBQ04sQ0FBQztnQkFNRCxpQkFBaUIsR0FBRztvQkFDaEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7d0JBQUEsTUFBTSxDQUFDO29CQUV6QixFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzFCLE1BQU0sQ0FBQztvQkFDWCxDQUFDO29CQUVELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksV0FBVyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFFN0MsTUFBTSxDQUFDO29CQUNYLENBQUM7b0JBRUQsaUJBQWlCLEVBQUUsQ0FBQztvQkFFcEIsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzt3QkFDWixXQUFXLEVBQUUsQ0FBQzt3QkFDZCxXQUFXLEdBQUcsVUFBVSxDQUFDOzRCQUNyQixXQUFXLEVBQUUsQ0FBQzs0QkFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3JCLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQzt3QkFDZixTQUFTLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQzt3QkFDdkMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7b0JBQzlDLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNyQixDQUFDO2dCQUVMLENBQUM7Z0JBRUQ7b0JBQ0ksYUFBYSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDN0MsYUFBYSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDNUMsYUFBYSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUNqRCxhQUFhLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQy9DLENBQUM7Z0JBRUQ7b0JBQ0ksWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUMxQixTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztvQkFDeEMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQy9DLENBQUM7Z0JBRUQscUJBQXFCLEdBQUc7b0JBQ3BCLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO3dCQUFBLE1BQU0sQ0FBQztvQkFDekIsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUVyQixNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLENBQUM7b0JBQzVDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQzt3QkFDZixXQUFXLEdBQUcsTUFBTSxDQUFDO29CQUN6QixJQUFJLENBQUMsQ0FBQzt3QkFDRixXQUFXLEdBQUcsRUFBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUM7b0JBQ2pGLENBQUM7b0JBR0ssT0FBUSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztvQkFDOUMsT0FBUSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQztvQkFFckQsR0FBRyxHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO29CQUN6QyxHQUFHLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7b0JBQ3pDLElBQUksR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDekIsSUFBSSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDO29CQUN4QixFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO3dCQUNoQixHQUFHLEdBQUcsR0FBRyxHQUFTLE9BQVEsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQzt3QkFDekQsR0FBRyxHQUFHLEdBQUcsR0FBUyxPQUFRLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7b0JBQzdELENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQzt3QkFDdkMsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQztvQkFDM0MsQ0FBQztvQkFFRCxTQUFTLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDbEMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBS3hDLDJCQUEyQixHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsK0JBQStCLEVBQUUsVUFBVSxLQUFLLEVBQUUsU0FBUzt3QkFDcEcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUN0QixDQUFDLENBQUMsQ0FBQztnQkFDUCxDQUFDO2dCQUVELGdCQUFnQixHQUFHO29CQUNmLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO3dCQUFBLE1BQU0sQ0FBQztvQkFDekIsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUVyQixFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNwQyxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUMzQixPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO3dCQUNqQyxVQUFVLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFOzRCQUNyQyxDQUFDLEVBQUUsR0FBRzs0QkFDTixDQUFDLEVBQUUsR0FBRzs0QkFDTixFQUFFLEVBQUUsR0FBRzs0QkFDUCxFQUFFLEVBQUUsR0FBRzs0QkFDUCxLQUFLLEVBQUUsR0FBRzs0QkFDVixPQUFPLEVBQUUsT0FBTzs0QkFDaEIsSUFBSSxFQUFFLEtBQUs7eUJBQ2QsQ0FBQyxDQUFDO3dCQUVILEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQzs0QkFDdEIsS0FBSyxDQUFDLE1BQU0sQ0FBQztnQ0FDVCxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsRUFBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDOzRCQUM1RCxDQUFDLENBQUMsQ0FBQzt3QkFDUCxDQUFDO29CQUNMLENBQUM7b0JBRUQsR0FBRyxHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO29CQUN6QyxHQUFHLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7b0JBRXpDLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUM7d0JBQ3JDLFlBQVksRUFBRSxDQUFDO29CQUNuQixDQUFDO29CQUVELEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7d0JBQ2hCLEdBQUcsR0FBRyxHQUFHLEdBQVMsT0FBUSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO3dCQUN0RCxHQUFHLEdBQUcsR0FBRyxHQUFTLE9BQVEsQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQztvQkFDekQsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO3dCQUNwQyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDO29CQUN2QyxDQUFDO29CQUVELFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBRXRCLFVBQVUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUU7d0JBQ3BDLENBQUMsRUFBRSxHQUFHO3dCQUNOLENBQUMsRUFBRSxHQUFHO3dCQUNOLEVBQUUsRUFBRSxHQUFHO3dCQUNQLEVBQUUsRUFBRSxHQUFHO3dCQUNQLEtBQUssRUFBRSxHQUFHO3dCQUNWLE9BQU8sRUFBRSxPQUFPO3dCQUNoQixJQUFJLEVBQUUsS0FBSzt3QkFDWCxHQUFHLEVBQUUsS0FBSzt3QkFDVixVQUFVLEVBQUUsV0FBVztxQkFDMUIsQ0FBQyxDQUFDO2dCQUNQLENBQUM7Z0JBRUQsbUJBQW1CLEdBQUc7b0JBQ2xCLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO3dCQUNkLE1BQU0sQ0FBQztvQkFDWCxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ3JCLFVBQVUsQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFO3dCQUNuQyxDQUFDLEVBQUUsR0FBRzt3QkFDTixDQUFDLEVBQUUsR0FBRzt3QkFDTixFQUFFLEVBQUUsR0FBRzt3QkFDUCxFQUFFLEVBQUUsR0FBRzt3QkFDUCxLQUFLLEVBQUUsR0FBRzt3QkFDVixPQUFPLEVBQUUsT0FBTzt3QkFDaEIsSUFBSSxFQUFFLEtBQUs7d0JBQ1gsUUFBUSxFQUFFLGNBQWM7d0JBQ3hCLEdBQUcsRUFBRSxLQUFLO3FCQUNiLENBQUMsQ0FBQztvQkFDSCxPQUFPLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUNwQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7b0JBQ3ZFLEtBQUssRUFBRSxDQUFDO29CQUNSLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUNuQyxTQUFTLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFFekMsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO3dCQUNyQixLQUFLLENBQUMsTUFBTSxDQUFDOzRCQUNULGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7d0JBQzNELENBQUMsQ0FBQyxDQUFDO29CQUNQLENBQUM7b0JBRUQsMkJBQTJCLEVBQUUsQ0FBQztnQkFDbEMsQ0FBQztnQkFFRCx3QkFBd0IsR0FBRztvQkFDdkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQzt3QkFBQSxNQUFNLENBQUM7b0JBRWxDLEtBQUssQ0FBQyxNQUFNLENBQUM7d0JBQ1QscUJBQXFCLENBQUMsS0FBSyxFQUFFLEVBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztvQkFDOUQsQ0FBQyxDQUFDLENBQUM7Z0JBQ1AsQ0FBQztnQkFFRDtvQkFDSSxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUM7d0JBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUM7b0JBQzlGLElBQUksQ0FBQyxDQUFDO3dCQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsYUFBYSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQztvQkFDbkosQ0FBQztnQkFDTCxDQUFDO2dCQUVELHFCQUFxQixDQUFDLEVBQUUsQ0FBQztvQkFDckIsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDbEMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzt3QkFDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQzs0QkFDUixTQUFTLEVBQUUsK0NBQStDLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsU0FBUzs0QkFDckYsU0FBUyxFQUFFLEtBQUs7NEJBQ2hCLG1CQUFtQixFQUFFLCtDQUErQyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLFNBQVM7NEJBQy9GLGVBQWUsRUFBRSxxQkFBcUIsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHO3lCQUM5RCxDQUFDLENBQUM7b0JBQ1AsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixPQUFPLENBQUMsR0FBRyxDQUFDOzRCQUNSLE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSTs0QkFDaEIsS0FBSyxFQUFFLENBQUMsR0FBRyxJQUFJOzRCQUNmLFVBQVUsRUFBRSxPQUFPOzRCQUNuQixTQUFTLEVBQUUsR0FBRzs0QkFDZCxLQUFLLEVBQUUsTUFBTTt5QkFDaEIsQ0FBQyxDQUFDO29CQUNQLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRDtvQkFDSSxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUUsT0FBTyxHQUFHLENBQUMsRUFDeEIsTUFBTSxHQUFHLFVBQVUsT0FBTzt3QkFDdEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBQyxDQUFDO29CQUNqRCxDQUFDLENBQUM7b0JBRU4sRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO3dCQUNuQixJQUNJLGFBQWEsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxFQUM1QyxjQUFjLEdBQUcsZUFBZSxDQUFDLFVBQVUsRUFBRSxFQUM3QyxjQUFjLEdBQUcsYUFBYSxHQUFHLGNBQWMsQ0FBQzt3QkFFcEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsYUFBYSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDOzRCQUM3QyxPQUFPLEdBQUcsQ0FBQyxjQUFjLENBQUM7d0JBQzlCLENBQUM7d0JBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxHQUFHLGtCQUFrQixDQUFDLENBQUMsQ0FBQzs0QkFDbkQsT0FBTyxHQUFHLGNBQWMsQ0FBQzt3QkFDN0IsQ0FBQztvQkFDTCxDQUFDO29CQUVELEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7d0JBQ2pCLElBQ0ksWUFBWSxHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLEVBQzFDLGVBQWUsR0FBRyxlQUFlLENBQUMsV0FBVyxFQUFFLEVBQy9DLGVBQWUsR0FBRyxZQUFZLEdBQUcsZUFBZSxDQUFDO3dCQUVyRCxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxZQUFZLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7NEJBQzVDLE9BQU8sR0FBRyxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUM7d0JBQ25DLENBQUM7d0JBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxHQUFHLGtCQUFrQixDQUFDLENBQUMsQ0FBQzs0QkFDcEQsT0FBTyxHQUFHLGNBQWMsR0FBRyxFQUFFLENBQUM7d0JBQ2xDLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxJQUFJLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNqQyxJQUNJLG1CQUFtQixHQUFHLGVBQWUsQ0FBQyxVQUFVLEVBQUUsRUFDbEQsa0JBQWtCLEdBQUcsZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDO3dCQUVyRCxlQUFlLENBQUMsVUFBVSxDQUFDLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxDQUFDO3dCQUMxRCxlQUFlLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxDQUFDO29CQUM1RCxDQUFDO2dCQUVMLENBQUM7WUFDTCxDQUFDO1NBQ0osQ0FBQTtJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRVAsVUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQzFCLFVBQVUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFlBQVk7UUFDNUQsTUFBTSxDQUFDO1lBQ0gsUUFBUSxFQUFFLEdBQUc7WUFDYixJQUFJLEVBQUUsVUFBVSxLQUFVLEVBQUUsT0FBTyxFQUFFLEtBQVU7Z0JBQzNDLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztnQkFDNUIsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7Z0JBRXpCLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQztnQkFDMUIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztnQkFDdEIsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO2dCQUV6QixJQUFJLGNBQWMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3JELElBQUksa0JBQWtCLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUVuRCxVQUFVLEVBQUUsQ0FBQztnQkFFYixNQUFNLENBQUM7Z0JBSVA7b0JBQ0ksZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMxQixDQUFDO2dCQUVELHlCQUF5QixNQUFNO29CQUUzQixFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQzt3QkFBQSxNQUFNLENBQUM7b0JBRW5CLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztvQkFDNUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ2pDLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLENBQUM7b0JBQzFDLEtBQUssQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUM7b0JBQ3hDLEtBQUssQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMxQyxDQUFDO2dCQUVELG1CQUFtQixNQUFNO29CQUNyQixlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzNCLENBQUM7Z0JBRUQsd0JBQXdCLE1BQU0sRUFBRSxNQUFNO29CQUNsQyxZQUFZLEdBQUcsTUFBTSxDQUFDO2dCQUMxQixDQUFDO2dCQUVELHFCQUFxQixHQUFHLEVBQUUsR0FBRztvQkFDekIsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7d0JBQUEsTUFBTSxDQUFDO29CQUN6QixVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFFdEMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7d0JBQ3JCLFFBQVEsQ0FBQzs0QkFDTCxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsRUFBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQzt3QkFDL0QsQ0FBQyxDQUFDLENBQUM7b0JBQ1AsQ0FBQztnQkFDTCxDQUFDO2dCQUVELG9CQUFvQixHQUFHLEVBQUUsR0FBRztvQkFDeEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7d0JBQUEsTUFBTSxDQUFDO29CQUN6QixVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFFdEMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7d0JBQ3BCLFFBQVEsQ0FBQzs0QkFDTCxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQzt3QkFDOUQsQ0FBQyxDQUFDLENBQUM7b0JBQ1AsQ0FBQztnQkFDTCxDQUFDO2dCQUVELG1CQUFtQixHQUFHLEVBQUUsR0FBRztvQkFHdkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLElBQUksS0FBSyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUNyQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUNyQyxNQUFNLENBQUM7b0JBQ1gsQ0FBQztvQkFFRCxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBRXhDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDOzRCQUNmLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3RCLENBQUM7d0JBRUQsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7NEJBQ3ZCLFFBQVEsQ0FBQztnQ0FDTCxjQUFjLENBQUMsS0FBSyxFQUFFO29DQUNsQixLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUk7b0NBQ2YsTUFBTSxFQUFFLEdBQUc7b0NBQ1gsT0FBTyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztpQ0FDcEMsQ0FBQyxDQUFDOzRCQUNQLENBQUMsQ0FBQyxDQUFDO3dCQUNQLENBQUM7b0JBQ0wsQ0FBQztvQkFFRCxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzt3QkFDcEIsUUFBUSxDQUFDOzRCQUNMLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO3dCQUM5RCxDQUFDLENBQUMsQ0FBQztvQkFDUCxDQUFDO29CQUVELGdCQUFnQixDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3pDLENBQUM7Z0JBRUQsb0JBQW9CLE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVztvQkFDM0MsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDdkMsS0FBSyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUM7b0JBQzVCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7d0JBQ1gsY0FBYyxHQUFHLE9BQU8sQ0FBQztvQkFDN0IsQ0FBQztvQkFDRCxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7b0JBQ3hDLE1BQU0sQ0FBQyxRQUFRLENBQUM7Z0JBQ3BCLENBQUM7Z0JBRUQsMEJBQTBCLFFBQVEsRUFBRSxXQUFXO29CQUMzQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dCQUNYLE9BQU8sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzt3QkFDbkMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDMUMsQ0FBQztvQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQ25DLGNBQWMsR0FBRyxJQUFJLENBQUM7d0JBQ3RCLE9BQU8sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzt3QkFDdEMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDN0MsQ0FBQztnQkFDTCxDQUFDO2dCQUFBLENBQUM7Z0JBRUYsaUJBQWlCLENBQUMsRUFBRSxDQUFDO29CQUNqQixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLEVBQUUsQ0FBQztvQkFDaEQsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDO29CQUM1RSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUM7b0JBQzFFLE1BQU0sQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLElBQUk7MkJBQ2hCLENBQUMsSUFBSSxNQUFNLENBQUMsS0FBSzsyQkFDakIsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNOzJCQUNsQixDQUFDLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFDM0IsQ0FBQztZQUNMLENBQUM7U0FDSixDQUFDO0lBQ04sQ0FBQyxDQUFDLENBQUM7SUF1R0gsVUFBVSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLE1BQU0sRUFBRSxRQUFRO1FBQzdELE1BQU0sQ0FBQztZQUNILFFBQVEsRUFBRSxHQUFHO1lBQ2IsSUFBSSxFQUFFLFVBQVUsS0FBVSxFQUFFLE9BQU8sRUFBRSxLQUFVO2dCQUMzQyxVQUFVLEVBQUUsQ0FBQztnQkFFYixNQUFNLENBQUM7Z0JBR1A7b0JBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQ3ZDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUIsQ0FBQztnQkFFRCx5QkFBeUIsTUFBTTtvQkFFM0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7d0JBQUEsTUFBTSxDQUFDO29CQUVuQixPQUFPLENBQUMsRUFBRSxDQUFDLHFEQUFxRCxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUNwRixDQUFDO2dCQUVELHNCQUFzQixLQUFLO29CQUN2QixJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDO29CQUM1QixDQUFDLENBQUMsY0FBYyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDdkMsQ0FBQyxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ3pDLENBQUMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO29CQUN0QixDQUFDLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztvQkFDdEIsTUFBTSxDQUFDLEtBQUssQ0FBQztnQkFDakIsQ0FBQztZQUNMLENBQUM7U0FDSixDQUFDO0lBQ04sQ0FBQyxDQUFDLENBQUM7SUFFSCxVQUFVLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtRQUNsQyxNQUFNLENBQUM7WUFDSCxRQUFRLEVBQUUsR0FBRztZQUNiLElBQUksRUFBRSxVQUFVLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSztnQkFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUNqRSxDQUFDO1NBQ0osQ0FBQztJQUNOLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLEVBQUUsQ0FBQzs7QUM5cEJMLENBQUM7SUFDRyxZQUFZLENBQUM7SUFFYixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVsRCxVQUFVLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxVQUFVLFFBQVEsRUFBRSxXQUFXLEVBQUUsT0FBTztRQUN2RSxNQUFNLENBQUM7WUFFSCxPQUFPLEVBQUUsVUFBVTtZQUNuQixJQUFJLEVBQUUsVUFBVSxNQUFXLEVBQUUsUUFBUSxFQUFFLE1BQVc7Z0JBQzlDLElBQUksUUFBUSxFQUFFLGNBQWMsRUFDeEIsVUFBVSxHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQ2pDLFlBQVksR0FBRyxHQUFHLEVBQ2xCLFlBQVksR0FBRyxHQUFHLEVBQ2xCLE1BQU0sRUFDTixZQUFZLEdBQUcsTUFBTSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsZUFBZSxHQUFHLElBQUksRUFDckUsTUFBTSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxFQUNqRSxlQUFlLEdBQUcsTUFBTSxDQUFDLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUMxRixTQUFTLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxLQUFLLENBQUM7Z0JBRXZGLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDZixRQUFRLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQztnQkFFeEMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ2pCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTt3QkFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNuQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ2IsQ0FBQztnQkFFRCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztvQkFDeEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRTt3QkFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNuQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ2IsQ0FBQztnQkFHRCxtQkFBbUIsS0FBSztvQkFDcEIsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQzt3QkFBQyxNQUFNLENBQUMsS0FBSyxDQUFDO29CQUNoQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQzt3QkFBQyxNQUFNLENBQUMsS0FBSyxDQUFDO29CQUN6QixLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUN2QyxNQUFNLENBQUMsS0FBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLElBQUksTUFBTSxDQUFDO2dCQUMzQyxDQUFDO2dCQUFBLENBQUM7Z0JBRUYsY0FBYyxLQUFLO29CQUNmLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7d0JBQ2YsTUFBTSxDQUFDLFlBQVksQ0FBQztvQkFDeEIsQ0FBQztvQkFFRCxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBRXZELEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDekIsTUFBTSxDQUFDLEVBQUUsQ0FBQTtvQkFDYixDQUFDO29CQUVELElBQUksR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDO29CQUU5QixPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbkQsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDYixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNkLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBRWYsRUFBRSxDQUFDLENBQUMsT0FBTyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUM7d0JBQ3pCLE9BQU8sSUFBSSxZQUFZLENBQUM7b0JBQzVCLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osT0FBTyxJQUFJLFlBQVksQ0FBQztvQkFDNUIsQ0FBQztvQkFFRCxNQUFNLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsSUFBSSxHQUFHLE9BQU8sR0FBRyxHQUFHLENBQUM7Z0JBQzdFLENBQUM7Z0JBRUQscUJBQXFCLE9BQU8sRUFBRSxLQUFLO29CQUMvQixPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDcEMsQ0FBQztnQkFFRCx1QkFBdUIsUUFBUTtvQkFDM0IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsVUFBQyxDQUFDO3dCQUNoQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM5QixDQUFDLENBQUMsQ0FBQztvQkFFSCxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUVyQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztvQkFDL0QsQ0FBQztnQkFDTCxDQUFDO2dCQUVEO29CQUNJLElBQUksUUFBUSxHQUFHLFVBQVUsR0FBRyxnQkFBZ0IsR0FBRyx3QkFBd0IsQ0FBQztvQkFDeEUsUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ25DLGNBQWMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO29CQUNqQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBRXhCLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFO3dCQUNqQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDakMsTUFBTSxDQUFDO3dCQUNYLENBQUM7d0JBQ0QsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs0QkFDVCxJQUFJLEVBQUUsQ0FBQzt3QkFDWCxDQUFDO3dCQUNELFFBQVEsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQzt3QkFDM0MsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzs0QkFDWixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUV0QyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOzRCQUV4QyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzRCQUM3QyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO3dCQUNuQyxDQUFDO3dCQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNKLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsK0JBQStCLENBQUMsQ0FBQzt3QkFDdEQsQ0FBQztvQkFHTCxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFO3dCQUNkLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2xDLE1BQU0sQ0FBQzt3QkFDWCxDQUFDO3dCQUNELFFBQVEsQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsQ0FBQzt3QkFFOUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzs0QkFFWixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNuQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDLENBQUM7d0JBQ3pELENBQUM7d0JBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ0osQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQzt3QkFDdEMsQ0FBQztvQkFHTCxDQUFDLENBQUMsQ0FBQztnQkFDUCxDQUFDO2dCQUVELHlCQUF5QixDQUFDO29CQUN0QixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7b0JBRW5DLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVU7d0JBQzFDLE9BQU8sSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVE7d0JBQ3hDLE9BQU8sSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVc7d0JBQzNDLE9BQU8sSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7d0JBRTdDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFFbkIsSUFDSSxTQUFTLEdBQUcsQ0FBQyxPQUFPLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksT0FBTyxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUNoSCxhQUFhLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO3dCQUUvRSxFQUFFLENBQUMsQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLGFBQWEsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDOzRCQUN2RCxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ3BDLENBQUM7b0JBQ0wsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztTQUNKLENBQUM7SUFDTixDQUFDLENBQUMsQ0FBQztBQUVQLENBQUMsQ0FBQyxFQUFFLENBQUM7O0FDdEpMLENBQUM7SUFDRyxZQUFZLENBQUM7SUFFYixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRXpELFVBQVUsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQ3BDLFVBQVMsVUFBVSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTTtRQUMzQyxJQUFJLHFCQUFxQixHQUFHLEdBQUcsQ0FBQztRQUVoQyxNQUFNLENBQUM7WUFDSCxLQUFLLEVBQUU7Z0JBQ0gsaUJBQWlCLEVBQUUsR0FBRztnQkFDdEIsa0JBQWtCLEVBQUUsR0FBRztnQkFDdkIsaUJBQWlCLEVBQUUsR0FBRztnQkFDdEIsaUJBQWlCLEVBQUUsR0FBRztnQkFDdEIsMEJBQTBCLEVBQUUsR0FBRztnQkFDL0IsdUJBQXVCLEVBQUUsR0FBRzthQUMvQjtZQUNELElBQUksRUFBRSxVQUFTLE1BQVcsRUFBRSxRQUFRLEVBQUUsTUFBVztnQkFDN0MsSUFDSSxnQkFBZ0IsR0FBRyxJQUFJLEVBQ3ZCLGVBQWUsRUFDZixjQUFjLEdBQUcsSUFBSSxFQUNyQixjQUFjLEdBQUcsSUFBSSxFQUNyQixhQUFhLEdBQUcsSUFBSSxFQUNwQix1QkFBdUIsR0FBRyxJQUFJLEVBQzlCLGlCQUFpQixHQUFHLEtBQUssRUFDekIsYUFBYSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBRTdDLGdCQUFnQixPQUFPO29CQUNuQixPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQztvQkFDaEMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzlCLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUM7b0JBQ3pELENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7b0JBQ2hDLENBQUM7Z0JBQ0wsQ0FBQztnQkFBQSxDQUFDO2dCQUVGLG1CQUFtQixPQUFPO29CQUN0QixFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDM0QsTUFBTSxDQUFDO29CQUNYLENBQUM7b0JBQ0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLEdBQUcsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3pFLENBQUM7Z0JBQUEsQ0FBQztnQkFFRixxQkFBcUIsT0FBTztvQkFDeEIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUM7b0JBQ2hDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUM1QixNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDO29CQUN0RCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUM7b0JBQ3pELENBQUM7Z0JBQ0wsQ0FBQztnQkFBQSxDQUFDO2dCQUVGLElBQUksaUJBQWlCLEdBQUc7b0JBQ3BCLElBQ0ksZUFBZSxFQUNmLGtCQUFrQixFQUNsQixhQUFhLEVBQ2IsU0FBUyxFQUNULFlBQVksQ0FBQztvQkFFakIsRUFBRSxDQUFDLENBQUMsZUFBZSxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUM7d0JBQ3BDLGVBQWUsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7d0JBQ3JHLGFBQWEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUMzRCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLGVBQWUsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7d0JBQzFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQzt3QkFDdkIsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDeEMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO3dCQUNwRCxDQUFDO3dCQUNELGFBQWEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsa0JBQWtCLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNoRixDQUFDO29CQUVELEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQzt3QkFDcEIsYUFBYSxHQUFHLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLElBQVUsUUFBUSxDQUFDLENBQUMsQ0FBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO29CQUN2RyxDQUFDO29CQUVELFNBQVMsR0FBRyxhQUFhLEdBQUcsZUFBZSxDQUFDO29CQUM1QyxZQUFZLEdBQUcsU0FBUyxJQUFJLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxjQUFjLEdBQUcsQ0FBQyxDQUFDO29CQUV6RSxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO3dCQUNmLGdCQUFnQixHQUFHLElBQUksQ0FBQzt3QkFDeEIsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQzs0QkFDaEIsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQ0FDdkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDOzRCQUN0QyxDQUFDOzRCQUFDLElBQUksQ0FBQyxDQUFDO2dDQUNKLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOzRCQUNuRCxDQUFDO3dCQUNMLENBQUM7b0JBQ0wsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixNQUFNLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO29CQUNwQyxDQUFDO2dCQUNMLENBQUMsQ0FBQztnQkFFRixFQUFFLENBQUMsQ0FBQyxxQkFBcUIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNoQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHFCQUFxQixDQUFDLENBQUM7Z0JBQzdFLENBQUM7Z0JBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUU7b0JBQ25CLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLGlCQUFpQixDQUFDLENBQUM7b0JBQ3BELEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ2xDLHVCQUF1QixFQUFFLENBQUM7d0JBQzFCLE1BQU0sQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUM7b0JBQzFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsOEJBQThCLENBQUM7b0JBQzNCLE1BQU0sQ0FBQyxjQUFjLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0MsQ0FBQztnQkFBQSxDQUFDO2dCQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFDekQsb0JBQW9CLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBRS9DLDhCQUE4QixDQUFDO29CQUMzQixhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ25CLEVBQUUsQ0FBQyxDQUFDLGFBQWEsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7d0JBQ3BDLGdCQUFnQixHQUFHLEtBQUssQ0FBQzt3QkFDekIsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQy9CLENBQUM7Z0JBQ0wsQ0FBQztnQkFBQSxDQUFDO2dCQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFDekQsb0JBQW9CLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBRS9DLHVDQUF1QyxDQUFDO29CQUNwQyxNQUFNLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQyxDQUFDO2dCQUFBLENBQUM7Z0JBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDO2dCQUMzRSw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQztnQkFFakUseUJBQXlCLFlBQVk7b0JBQ2pDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUMxQixlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO29CQUN4RCxDQUFDO29CQUVELGVBQWUsR0FBRyxZQUFZLENBQUM7b0JBQy9CLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUN2QixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztvQkFDN0QsQ0FBQztnQkFDTCxDQUFDO2dCQUFBLENBQUM7Z0JBRUYsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUMvQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO29CQUNqQyx1QkFBdUIsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO2dCQUNoRyxDQUFDO2dCQUVELCtCQUErQixZQUFZO29CQUN2QyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3RELE1BQU0sQ0FBQztvQkFDWCxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLFlBQVksWUFBWSxXQUFXLENBQUMsQ0FBQyxDQUFDO3dCQUN0QyxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDakQsQ0FBQztvQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxZQUFZLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7d0JBQ25ELFlBQVksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzFFLENBQUM7b0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sWUFBWSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7d0JBQzFDLFlBQVksR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUN6RCxDQUFDO29CQUVELEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO3dCQUNyRCxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDNUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDekMsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7b0JBQy9ELENBQUM7Z0JBQ0wsQ0FBQztnQkFBQSxDQUFDO2dCQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxZQUFZO29CQUN0RCxFQUFFLENBQUMsQ0FBQyxZQUFZLEtBQUssZUFBZSxDQUFDO3dCQUNqQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDNUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gscUJBQXFCLENBQUMsTUFBTSxDQUFDLGtCQUFrQixJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUV2RCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ2pDLGVBQWUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELENBQUM7Z0JBQ0QsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLHNCQUFzQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ3hDLGNBQWMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUNqRSxDQUFDO2dCQUVELE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDZCxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO3dCQUNqQixNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDL0IsQ0FBQztnQkFDTCxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDZCxDQUFDO1NBQ0osQ0FBQTtJQUNMLENBQUMsQ0FDSixDQUFDO0FBRU4sQ0FBQyxDQUFDLEVBQUUsQ0FBQzs7QUNwTUwsWUFBWSxDQUFDO0FBRWI7SUFBQTtJQU1BLENBQUM7SUFBRCxxQkFBQztBQUFELENBTkEsQUFNQyxJQUFBO0FBTlksd0NBQWM7QUFRM0I7SUFBQTtJQUlBLENBQUM7SUFBRCxvQkFBQztBQUFELENBSkEsQUFJQztBQUhVLHFCQUFPLEdBQVcsU0FBUyxDQUFDO0FBQzVCLG1CQUFLLEdBQVcsT0FBTyxDQUFDO0FBQ3hCLHNCQUFRLEdBQVcsVUFBVSxDQUFDO0FBSDVCLHNDQUFhO0FBTTFCO0lBMkZJLDBCQUNJLE9BQVksRUFDWixrQkFBMEIsRUFDMUIsTUFBc0IsRUFDdEIsUUFBeUM7UUFFekMsVUFBVSxDQUFDO1FBTmYsaUJBb0hDO1FBOU1PLGVBQVUsR0FBRztZQUNqQixHQUFHLEVBQUUsR0FBRztZQUNSLEdBQUcsRUFBRSxHQUFHO1lBQ1IsR0FBRyxFQUFFLEdBQUc7WUFDUixHQUFHLEVBQUUsR0FBRztZQUNSLEdBQUcsRUFBRSxHQUFHO1lBQ1IsR0FBRyxFQUFFLEdBQUc7WUFDUixHQUFHLEVBQUUsR0FBRztZQUNSLEdBQUcsRUFBRSxHQUFHO1lBQ1IsR0FBRyxFQUFFLEdBQUc7WUFDUixHQUFHLEVBQUUsR0FBRztZQUNSLEdBQUcsRUFBRSxHQUFHO1lBQ1IsR0FBRyxFQUFFLEdBQUc7WUFDUixHQUFHLEVBQUUsR0FBRztZQUNSLEdBQUcsRUFBRSxHQUFHO1lBQ1IsR0FBRyxFQUFFLElBQUk7WUFDVCxHQUFHLEVBQUUsR0FBRztZQUNSLEdBQUcsRUFBRSxHQUFHO1lBQ1IsR0FBRyxFQUFFLEdBQUc7WUFDUixJQUFJLEVBQUUsR0FBRztTQUNaLENBQUM7UUFFTSxpQkFBWSxHQUFHO1lBQ25CLEtBQUssRUFBRSxFQUFFO1lBQ1QsUUFBUSxFQUFFLEVBQUU7WUFDWixLQUFLLEVBQUUsQ0FBQztZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsUUFBUSxFQUFFLEVBQUU7WUFDWixPQUFPLEVBQUUsRUFBRTtZQUNYLFdBQVcsRUFBRSxDQUFDO1lBRWQsWUFBWSxFQUFFLEdBQUc7WUFDakIsYUFBYSxFQUFFLEdBQUc7WUFDbEIsUUFBUSxFQUFFLEdBQUc7WUFDYixVQUFVLEVBQUUsRUFBRTtZQUNkLFdBQVcsRUFBRSxFQUFFO1lBQ2YsTUFBTSxFQUFFLEVBQUU7WUFDVixTQUFTLEVBQUUsR0FBRztZQUNkLFVBQVUsRUFBRSxHQUFHO1lBQ2YsS0FBSyxFQUFFLEdBQUc7WUFFVixPQUFPLEVBQUUsRUFBRTtZQUNYLE9BQU8sRUFBRSxFQUFFO1lBRVgsUUFBUSxFQUFFLEVBQUU7WUFDWixNQUFNLEVBQUUsRUFBRTtZQUNWLFFBQVEsRUFBRSxFQUFFO1lBQ1osS0FBSyxFQUFFLEVBQUU7WUFFVCxRQUFRLEVBQUUsRUFBRTtZQUNaLFNBQVMsRUFBRSxFQUFFO1lBQ2IsSUFBSSxFQUFFLEVBQUU7WUFFUixVQUFVLEVBQUUsRUFBRTtZQUNkLFdBQVcsRUFBRSxFQUFFO1lBQ2YsSUFBSSxFQUFFLEVBQUU7WUFFUixNQUFNLEVBQUUsRUFBRTtZQUNWLElBQUksRUFBRSxFQUFFO1lBQ1IsT0FBTyxFQUFFLEVBQUU7WUFDWCxNQUFNLEVBQUUsRUFBRTtZQUVWLElBQUksRUFBRSxHQUFHO1lBQ1QsSUFBSSxFQUFFLEdBQUc7WUFDVCxJQUFJLEVBQUUsR0FBRztZQUNULElBQUksRUFBRSxHQUFHO1lBQ1QsSUFBSSxFQUFFLEdBQUc7WUFDVCxJQUFJLEVBQUUsR0FBRztZQUNULElBQUksRUFBRSxHQUFHO1lBQ1QsSUFBSSxFQUFFLEdBQUc7WUFDVCxJQUFJLEVBQUUsR0FBRztZQUNULEtBQUssRUFBRSxHQUFHO1lBQ1YsS0FBSyxFQUFFLEdBQUc7WUFDVixLQUFLLEVBQUUsR0FBRztTQUNiLENBQUM7UUFFTSxjQUFTLEdBQUc7WUFDaEIsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFO1lBQ3hDLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtZQUN2QyxHQUFHLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUU7WUFDdEMsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFO1NBQzFDLENBQUM7UUFpQkUsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUM7UUFDdEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQztRQUNsQyxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFFekIsSUFBSSxDQUFDLGFBQWEsR0FBRyxVQUFDLEtBQXdCO1lBQzFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLEtBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsR0FBc0IsS0FBSyxJQUF1QixNQUFNLENBQUMsS0FBSyxDQUFDO1lBQ3BFLElBQUksSUFBWSxDQUFDO1lBRWpCLEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDN0IsSUFBSSxTQUFPLENBQUM7Z0JBQ1osRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQ1gsU0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQ3ZCLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO29CQUN0QixTQUFPLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQztnQkFDM0IsQ0FBQztnQkFFRCxFQUFFLENBQUMsQ0FBQyxTQUFPLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3hCLFNBQU8sR0FBRyxTQUFPLENBQUMsVUFBVSxDQUFDO2dCQUNqQyxDQUFDO2dCQUNELEVBQUUsQ0FBQyxDQUFDLFNBQU8sQ0FBQyxPQUFPLElBQUksT0FBTyxJQUFJLFNBQU8sQ0FBQyxPQUFPLElBQUksVUFBVSxDQUFDO29CQUFDLE1BQU0sQ0FBQztZQUM1RSxDQUFDO1lBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ1osSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDckIsQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDakIsSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDbkIsQ0FBQztZQUVELElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFFeEQsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQztnQkFBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO1lBQ2pDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUM7Z0JBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQztZQUVqQyxJQUFJLElBQUksR0FBYSxLQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUU3QyxJQUFJLEVBQUUsR0FBVyxDQUFDLENBQUM7WUFFbkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFBQyxLQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUN2RCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQzFELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDcEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFBQyxLQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUV2RCxJQUFJLENBQUMsR0FBVyxDQUFDLENBQUM7WUFDbEIsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsR0FBVyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRXhCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLEVBQUUsRUFBRSxDQUFDO29CQUNMLEtBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ3RDLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUN0QixFQUFFLEVBQUUsQ0FBQztvQkFDTCxLQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2dCQUN2QyxDQUFDO2dCQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDcEIsRUFBRSxFQUFFLENBQUM7b0JBQ0wsS0FBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDckMsQ0FBQztnQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQ3JCLEVBQUUsRUFBRSxDQUFDO29CQUNMLEtBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ3RDLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdEIsRUFBRSxDQUFDLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUMvQixFQUFFLEVBQUUsQ0FBQztvQkFDVCxDQUFDO2dCQUNMLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDN0IsRUFBRSxDQUFDLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDO3dCQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMxQyxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLEVBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUM7d0JBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxDQUFDO3dCQUNGLEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7NEJBQzNDLFNBQVMsR0FBRyxLQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUN2QyxFQUFFLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDakIsRUFBRSxFQUFFLENBQUM7NEJBQ1QsQ0FBQzt3QkFDTCxDQUFDO29CQUNMLENBQUM7Z0JBQ0wsQ0FBQztZQUNMLENBQUM7WUFFRCxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU07Z0JBQ2pCLEtBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNO2dCQUN6RCxLQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTTtnQkFDM0QsS0FBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLEtBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU07Z0JBQ3ZELEtBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUU1RSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxLQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNoQyxLQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVqQixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztvQkFFekIsQ0FBQyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7b0JBQ3RCLENBQUMsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO29CQUd0QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQzt3QkFDcEIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO3dCQUNwQixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ3ZCLENBQUM7b0JBRUQsTUFBTSxDQUFDLEtBQUssQ0FBQztnQkFDakIsQ0FBQztZQUNMLENBQUM7WUFDRCxLQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLEtBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFDckMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNuQyxLQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ3hDLENBQUMsQ0FBQztJQUNOLENBQUM7SUFDTCx1QkFBQztBQUFELENBaE5BLEFBZ05DLElBQUE7QUFoTlksNENBQWdCOztBQ2hCN0IsWUFBWSxDQUFDO0FBRWIsdURBSTRCO0FBaUI1QjtJQUtJLDJCQUNJLElBQW9CLEVBQ3BCLE1BQXNCO1FBRXRCLFVBQVUsQ0FBQztRQUNYLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxjQUFjLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFFckcsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVPLDRDQUFnQixHQUF4QjtRQUNJLElBQUksYUFBYSxHQUFtQjtZQUNoQyxJQUFJLEVBQUUsZ0NBQWEsQ0FBQyxPQUFPO1lBQzNCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLE1BQU0sRUFBRSxRQUFRO1lBQ2hCLE9BQU8sRUFBRSxJQUFJO1NBQ2hCLENBQUM7UUFFRixNQUFNLENBQUMsYUFBYSxDQUFDO0lBQ3pCLENBQUM7SUFFTyw0Q0FBZ0IsR0FBeEIsVUFBeUIsT0FBWSxFQUFFLGtCQUEwQixFQUFFLFFBQXdDO1FBQ3ZHLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUVYLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDakIsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBRXRCLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDakIsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUVaLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDakIsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELHNCQUFXLHVDQUFRO2FBQW5CO1lBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDM0IsQ0FBQzs7O09BQUE7SUFFTSwrQkFBRyxHQUFWLFVBQVcsV0FBbUIsRUFBRSxRQUF3QyxFQUFFLE1BQXNCO1FBQzVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsSUFBSSxhQUFhLEdBQW1CLE1BQU0sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUMzRyxJQUFJLGtCQUFrQixHQUFXLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzRCxJQUFJLE9BQU8sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDO1FBR25DLEVBQUUsQ0FBQyxDQUFDLE9BQU8sYUFBYSxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzFDLE9BQU8sR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixPQUFPLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQztRQUNuQyxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVoRSxNQUFNLENBQUE7UUFDVixDQUFDO1FBRUQsSUFBSSxtQkFBbUIsR0FBRyxJQUFJLG1DQUFnQixDQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFM0csSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLG1CQUFtQixDQUFDO1FBRzFELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDckIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDN0IsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN0RixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixPQUFPLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdEUsQ0FBQztJQUNMLENBQUM7SUFFTSxrQ0FBTSxHQUFiLFVBQWMsV0FBbUI7UUFDbkMsSUFBSSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDcEQsSUFBSSxPQUFPLEdBQXFCLElBQUksQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUUvRCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDL0UsT0FBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFBO1FBQzVDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQUMsTUFBTSxDQUFDO1FBRXJCLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDekIsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM3QixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBRXJDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7WUFDckMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBRUosT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBQ0wsd0JBQUM7QUFBRCxDQTFHQSxBQTBHQyxJQUFBO0FBMUdZLDhDQUFpQjtBQThHOUI7SUFBQTtJQXNCQSxDQUFDO0lBbEJHLHNCQUFXLDZDQUFNO2FBQWpCO1lBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDeEIsQ0FBQzthQUVELFVBQWtCLEtBQXFCO1lBQ25DLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxJQUFJLElBQUksaUNBQWMsRUFBRSxDQUFDO1FBQ2pELENBQUM7OztPQUpBO0lBTU0sd0NBQUksR0FBWCxVQUNJLElBQW9CO1FBRXBCLFVBQVUsQ0FBQztRQUVYLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTlELE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3pCLENBQUM7SUFDTCxnQ0FBQztBQUFELENBdEJBLEFBc0JDLElBQUE7QUFFRCxPQUFPO0tBQ0YsTUFBTSxDQUFDLGNBQWMsQ0FBQztLQUN0QixRQUFRLENBQUMsc0JBQXNCLEVBQUUseUJBQXlCLENBQUMsQ0FBQzs7QUMvSmpFLFlBQVksQ0FBQztBQWdCYjtJQU9JLDRCQUNJLFFBQWEsRUFDYixNQUFXLEVBQ1gsTUFBaUIsRUFDakIsSUFBb0IsRUFDcEIsTUFBVyxFQUNYLFFBQVEsRUFDUixvQkFBK0M7UUFFL0MsVUFBVSxDQUFDO1FBVGYsaUJBNENDO1FBbENHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBR2pCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3hELElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztZQUNsQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztZQUVqRCxNQUFNLENBQUE7UUFDVixDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDO1FBQ2hELENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFFL0MsTUFBTSxDQUFBO1FBQ1YsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixHQUFtQixNQUFNLENBQUMsaUJBQWlCLEdBQW1CLEVBQUUsQ0FBQztRQUN4RyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7UUFFL0Isb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsVUFBQyxDQUFPO1lBQ2pELEtBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUMsTUFBTSxFQUFFLEVBQUMsR0FBRyxFQUFFLENBQUMsRUFBQyxFQUFDLENBQUMsQ0FBQztRQUNyRCxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWpCLFFBQVEsQ0FBQztZQUNMLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxLQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNkLENBQUM7SUFFTyw2Q0FBZ0IsR0FBeEIsVUFBeUIsTUFBTTtRQUMzQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUNMLHlCQUFDO0FBQUQsQ0F4REEsQUF3REMsSUFBQTtBQUdELENBQUM7SUFFRyw0QkFBNEIsTUFBTTtRQUM5QixNQUFNLENBQUM7WUFDSCxRQUFRLEVBQUUsR0FBRztZQUNiLEtBQUssRUFBRSxLQUFLO1lBQ1osVUFBVSxFQUFFLGtCQUFrQjtTQUNqQyxDQUFDO0lBQ04sQ0FBQztJQUdELE9BQU87U0FDRixNQUFNLENBQUMsY0FBYyxDQUFDO1NBQ3RCLFNBQVMsQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsRUFBRSxDQUFDOztBQ3pGTCxZQUFZLENBQUM7Ozs7OztBQVlGLFFBQUEscUJBQXFCLEdBQUcscUJBQXFCLENBQUM7QUFFekQ7SUFBQTtJQXlCQSxDQUFDO0lBQUQseUJBQUM7QUFBRCxDQXpCQSxBQXlCQyxJQUFBO0FBekJZLGdEQUFrQjtBQTJCL0I7SUFBa0MsZ0NBQWtCO0lBQXBEOztJQUVBLENBQUM7SUFBRCxtQkFBQztBQUFELENBRkEsQUFFQyxDQUZpQyxrQkFBa0IsR0FFbkQ7QUFGWSxvQ0FBWTtBQUl6QjtJQUFBO1FBRVcsb0JBQWUsR0FBbUIsRUFBRSxDQUFDO1FBRXJDLG1CQUFjLEdBQW1CLEVBQUUsQ0FBQztRQUVwQyxtQkFBYyxHQUFtQixJQUFJLENBQUM7SUFDakQsQ0FBQztJQUFELHNCQUFDO0FBQUQsQ0FQQSxBQU9DLElBQUE7QUFQWSwwQ0FBZTtBQTJCNUI7SUFTSSwwQkFDSSxNQUF1QixFQUN2QixVQUFnQyxFQUNoQyxPQUEwQixFQUMxQixTQUE4QixFQUM5QixTQUFtQyxFQUNuQyxvQkFBdUM7UUFFdkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUNqQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMscUJBQXFCLEdBQUcsb0JBQW9CLENBQUM7UUFFdEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFekQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBR08sMENBQWUsR0FBdkI7UUFFSSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRXJELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFL0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNkJBQXFCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTNELElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVPLDBDQUFlLEdBQXZCLFVBQXdCLFVBQTBCO1FBQWxELGlCQUlDO1FBSEcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBQyxDQUFDO1lBQ2pCLEtBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLDJDQUFnQixHQUF4QixVQUF5QixPQUEyQixFQUFFLEtBQXdCO1FBQzFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLE1BQU0sQ0FBQztZQUNYLENBQUM7UUFDTCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDbkIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUM7UUFDWCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDZixJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztZQUMxQyxNQUFNLENBQUM7UUFDWCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDZCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDO1FBQ1gsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNyRCxDQUFDO1lBQ0QsTUFBTSxDQUFDO1FBQ1gsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFFSixJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEUsQ0FBQztJQUNMLENBQUM7SUFFTyx1Q0FBWSxHQUFwQixVQUFxQixVQUEwQjtRQUEvQyxpQkFjQztRQWJHLElBQUksY0FBYyxHQUFtQixJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBbUIsRUFBRSxDQUFDO1FBRXBILENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQUMsQ0FBQztZQUNqQixJQUFJLE1BQU0sR0FBbUIsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLGNBQWMsQ0FBQztZQUNwRSxJQUFJLE1BQVcsQ0FBQztZQUVoQixNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDMUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7WUFFdkIsS0FBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFVBQUMsQ0FBTztnQkFDL0MsS0FBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFJRCxzQkFBVyxvQ0FBTTthQUFqQjtZQUNJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3hCLENBQUM7OztPQUFBO0lBRUQsc0JBQVcsNENBQWM7YUFBekI7WUFDSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDdkMsQ0FBQzthQUVELFVBQTBCLEtBQXFCO1lBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxHQUFHLEtBQUssSUFBSSxJQUFJLENBQUM7WUFDNUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzNCLENBQUM7OztPQUxBO0lBT0Qsc0JBQVcsNkNBQWU7YUFBMUI7WUFDSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7UUFDeEMsQ0FBQzthQUVELFVBQTJCLEtBQXFCO1lBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzNCLENBQUM7OztPQUxBO0lBT0Qsc0JBQVcsNENBQWM7YUFBekI7WUFDSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDdkMsQ0FBQzthQUVELFVBQTBCLEtBQXFCO1lBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzNCLENBQUM7OztPQUxBO0lBT00sNkJBQUUsR0FBVCxVQUFVLGVBQWdDLEVBQUUsY0FBK0I7UUFDdkUsRUFBRSxDQUFDLENBQUMsZUFBZSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUNuRCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsY0FBYyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUNqRCxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFTSw4QkFBRyxHQUFWO1FBQ0ksSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUNMLHVCQUFDO0FBQUQsQ0ExSkEsQUEwSkMsSUFBQTtBQUVEO0lBQUE7UUFDWSxZQUFPLEdBQW9CLElBQUksZUFBZSxFQUFFLENBQUM7SUFpRDdELENBQUM7SUE5Q0csc0JBQVcscUNBQU07YUFBakI7WUFDSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN4QixDQUFDO2FBRUQsVUFBa0IsS0FBc0I7WUFDcEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLElBQUksSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNsRCxDQUFDOzs7T0FKQTtJQU1ELHNCQUFXLDZDQUFjO2FBQXpCO1lBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQ3ZDLENBQUM7YUFFRCxVQUEwQixLQUFxQjtZQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBRyxLQUFLLElBQUksSUFBSSxDQUFDO1FBQ2hELENBQUM7OztPQUpBO0lBTUQsc0JBQVcsOENBQWU7YUFBMUI7WUFDSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7UUFDeEMsQ0FBQzthQUVELFVBQTJCLEtBQXFCO1lBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDL0MsQ0FBQzs7O09BSkE7SUFNRCxzQkFBVyw2Q0FBYzthQUF6QjtZQUNJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUN2QyxDQUFDO2FBRUQsVUFBMEIsS0FBcUI7WUFDM0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEdBQUcsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUM5QyxDQUFDOzs7T0FKQTtJQU1NLGdDQUFJLEdBQVgsVUFDSSxVQUFnQyxFQUNoQyxPQUEwQixFQUMxQixTQUE4QixFQUM5QixTQUFtQyxFQUNuQyxvQkFBdUM7UUFFdkMsVUFBVSxDQUFDO1FBRVgsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUM7WUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFeEgsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDekIsQ0FBQztJQUNMLHdCQUFDO0FBQUQsQ0FsREEsQUFrREMsSUFBQTtBQUVELE9BQU87S0FDRixNQUFNLENBQUMsY0FBYyxDQUFDO0tBQ3RCLFFBQVEsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQzs7QUMxUmpELFlBQVksQ0FBQzs7OztBQUViLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFFNUQscUNBQW1DO0FBQ25DLDhCQUE0QjtBQUM1QiwrQkFBNkI7QUFFN0Isd0NBQW1DO0FBQ25DLCtDQUEwQzs7QUNGMUMsQ0FBQztJQUNHLFlBQVksQ0FBQztJQUViLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRW5ELFVBQVUsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLFVBQVUsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRO1FBQ3ZFLE1BQU0sQ0FBQztZQUNILFFBQVEsRUFBRSxHQUFHO1lBQ2IsS0FBSyxFQUFFLEtBQUs7WUFDWixJQUFJLEVBQUUsVUFBVSxNQUFXLEVBQUUsUUFBUSxFQUFFLE1BQVc7Z0JBQzlDLElBQ0ksV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLEVBQ3BFLFdBQVcsR0FBRyxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxJQUFJLEVBQ3JELFFBQVEsR0FBRyxNQUFNLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsSUFBSSxFQUNyRSxRQUFRLEdBQUcsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUM1QyxZQUFZLEdBQUcsTUFBTSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksRUFDakUsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxJQUFJLEVBQ3ZGLFFBQVEsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUN4QyxRQUFRLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxVQUFVLEdBQUcsRUFBRSxFQUM1RCxTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxzQkFBc0IsR0FBRyxpQkFBaUIsRUFDdEYsYUFBYSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFDbkMscUJBQXFCLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFDakQsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixFQUMxQyxVQUFVLEdBQUcsS0FBSyxDQUFDO2dCQUd2QixJQUFJLFdBQVcsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsZUFBZSxDQUFDO2dCQUUvRyxJQUFJLGFBQWEsR0FBRyxFQUFFLEVBQ2xCLFFBQVEsR0FBRyxHQUFHLEVBQ2QsVUFBVSxHQUFHLEdBQUcsQ0FBQztnQkFHckIsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUscUJBQXFCLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBRXRELFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDOUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUNuRCxRQUFRLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQ2pELFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDL0MsUUFBUSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUNyRCxRQUFRLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDbEMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ2xDLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUdwQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNqQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxVQUFVLGdCQUFnQjt3QkFDakQsVUFBVSxDQUFDLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQztvQkFDaEQsQ0FBQyxDQUFDLENBQUM7Z0JBQ1AsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDSixNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxVQUFVLGFBQWE7d0JBQzNDLFVBQVUsQ0FBQzs0QkFDUCxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO3dCQUM1RCxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ1YsQ0FBQyxDQUFDLENBQUM7Z0JBQ1AsQ0FBQztnQkFHRCxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7b0JBQ25CLE1BQU0sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7d0JBRTVCLFVBQVUsQ0FBQzs0QkFDUCxhQUFhLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDOzRCQUNwQyxVQUFVLENBQUMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQzt3QkFDN0MsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNaLENBQUMsQ0FBQyxDQUFDO2dCQUNQLENBQUM7Z0JBR0QsVUFBVSxDQUFDLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRzFFLG1CQUFtQixLQUFLO29CQUNwQixFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDO3dCQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7b0JBQ2hDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO3dCQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7b0JBQ3pCLEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQ3ZDLE1BQU0sQ0FBQyxLQUFLLElBQUksR0FBRyxJQUFJLEtBQUssSUFBSSxNQUFNLENBQUM7Z0JBQzNDLENBQUM7Z0JBQUEsQ0FBQztnQkFHRixvQkFBb0IsVUFBVTtvQkFDMUIsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDO3dCQUFDLE1BQU0sQ0FBQztvQkFDdkIsSUFBSSxTQUFTLEdBQUcsVUFBVSxDQUFDLFNBQVMsRUFDaEMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQzFCLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxFQUMvRCxXQUFXLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFDMUIsSUFBSSxHQUFHLENBQUM7d0JBQ0osRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQzs0QkFBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQzt3QkFDNUMsRUFBRSxDQUFDLENBQUMsU0FBUyxLQUFLLFNBQVMsSUFBSSxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUM5QyxTQUFTLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDckUsQ0FBQzt3QkFDRCxFQUFFLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLFNBQVMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDOzRCQUM1QyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO3dCQUMzQixDQUFDO29CQUNMLENBQUMsRUFBRyxDQUFDLEVBQ0wsVUFBVSxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUM7b0JBRXZDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ1AsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsQ0FBQzt3QkFDNUQsSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDOzZCQUN2QixRQUFRLENBQUMscUJBQXFCLENBQUM7NkJBQy9CLEtBQUssRUFBRSxDQUFDO3dCQUNiLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDOzRCQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbEMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDOzRCQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUMvQyxDQUFDO2dCQUNMLENBQUM7Z0JBQUEsQ0FBQztnQkFFRiw2QkFBNkIsS0FBSztvQkFDOUIsSUFBSSxnQkFBZ0IsR0FBRyxhQUFhLENBQUM7b0JBQ3JDLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDbkIsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7d0JBQ2hELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUN2QyxhQUFhLEdBQUcsS0FBSyxDQUFDOzRCQUV0QixLQUFLLENBQUM7d0JBQ1YsQ0FBQztvQkFDTCxDQUFDO29CQUdELEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixJQUFJLGFBQWEsSUFBSSxhQUFhLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUM1RCxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUMvQixDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzVCLENBQUM7b0JBRUQ7d0JBQ0ksSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsRUFDcEQsVUFBVSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBRTdDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQzs0QkFBQyxXQUFXLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO3dCQUNwRCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7NEJBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQzt3QkFDM0MsUUFBUSxFQUFFLENBQUM7b0JBQ2YsQ0FBQztvQkFBQSxDQUFDO29CQUVGO3dCQUNJLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQ3BELFVBQVUsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUU3QyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDOzRCQUNmLFlBQVksQ0FBQyxNQUFNLEVBQUU7Z0NBQ2pCLE1BQU0sRUFBRTtvQ0FDSixNQUFNLEVBQUUsUUFBUTtvQ0FDaEIsSUFBSSxFQUFFLFlBQVk7b0NBQ2xCLEtBQUssRUFBRSxhQUFhO29DQUNwQixFQUFFLEVBQUUsVUFBVTtvQ0FDZCxRQUFRLEVBQUUsYUFBYTtvQ0FDdkIsUUFBUSxFQUFFLGdCQUFnQjtpQ0FDN0I7NkJBQ0osQ0FBQyxDQUFDO3dCQUNQLENBQUM7b0JBQ0wsQ0FBQztnQkFDTCxDQUFDO2dCQUFBLENBQUM7Z0JBRUYsc0JBQXNCLEtBQUs7b0JBQ3ZCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQzt3QkFBQyxNQUFNLENBQUM7b0JBRXJCLElBQ0ksWUFBWSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQ3BDLGVBQWUsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQ25DLGVBQWUsR0FBRyxZQUFZLEdBQUcsZUFBZSxFQUNoRCxPQUFPLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFDNUIsVUFBVSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQ3BDLFVBQVUsR0FBRyxPQUFPLEdBQUcsVUFBVSxFQUNqQyxrQkFBa0IsR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBRTlDLFVBQVUsR0FBRyxJQUFJLENBQUM7b0JBQ2xCLFVBQVUsQ0FBQzt3QkFDUCxVQUFVLEdBQUcsS0FBSyxDQUFDO29CQUN2QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBRVIsRUFBRSxDQUFDLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQ3pCLFFBQVEsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEdBQUcsT0FBTyxHQUFHLFlBQVksQ0FBQyxDQUFDO29CQUNwRSxDQUFDO29CQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQzt3QkFDcEMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsR0FBRyxVQUFVLEdBQUcsZUFBZSxDQUFDLENBQUM7b0JBQzFFLENBQUM7Z0JBRUwsQ0FBQztnQkFBQSxDQUFDO2dCQUVGLHlDQUF5QyxXQUFXO29CQUVoRCxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO3dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQztvQkFDbEMsQ0FBQztvQkFFRCxNQUFNLENBQUMsV0FBVyxDQUFDO2dCQUN2QixDQUFDO2dCQUFBLENBQUM7Z0JBRUYsdUJBQXVCLEtBQUs7b0JBQ3hCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxHQUFHLGFBQWEsQ0FBQztvQkFFOUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQzt3QkFDbkcsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDaEIsQ0FBQztvQkFFRCxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUNqQixDQUFDO2dCQUFBLENBQUM7Z0JBRUYsc0JBQXNCLEtBQUs7b0JBQ3ZCLFVBQVUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRSxDQUFDO2dCQUVELHNCQUFzQixFQUFFO29CQUdwQixJQUFJLEtBQUssR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDO29CQUM3QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ2hCLENBQUM7b0JBQ0QsSUFBSSxhQUFhLEdBQUcsK0JBQStCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNsRSxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBRXRDLGFBQWEsR0FBRyxJQUFJLENBQUM7b0JBQ3JCLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUM7b0JBQ3JDLGFBQWEsR0FBRyxhQUFhLENBQUM7b0JBRTlCLFdBQVcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO29CQUMxQixXQUFXLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQztvQkFFMUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBRW5ELENBQUM7b0JBRUQsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDaEIsQ0FBQztnQkFFRCxxQkFBcUIsRUFBRTtvQkFDbkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO3dCQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNoQixDQUFDO29CQUNELElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUM7b0JBRTdCLEVBQUUsQ0FBQyxDQUFDLGFBQWEsS0FBSywrQkFBK0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDMUYsYUFBYSxHQUFHLEtBQUssQ0FBQzt3QkFDdEIsYUFBYSxHQUFHLElBQUksQ0FBQztvQkFDekIsQ0FBQztvQkFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNoQixDQUFDO2dCQUVELG9CQUFvQixFQUFFO29CQUNsQixJQUFJLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsR0FBRyxhQUFhLENBQUM7b0JBRTVHLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQzt3QkFDakIsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDaEIsQ0FBQztvQkFDRCxLQUFLLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQztvQkFFekIsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUM7d0JBQy9DLGVBQWUsR0FBRyxJQUFJLENBQUM7d0JBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ2hCLENBQUM7b0JBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLGtCQUFrQixDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQzt3QkFDdEQsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDaEIsQ0FBQztvQkFHRCxlQUFlLEdBQUcsS0FBSyxDQUFDO29CQUV4QixhQUFhLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztvQkFFaEMscUJBQXFCLEdBQUcsa0JBQWtCLENBQUM7b0JBQzNDLGFBQWEsR0FBRyxLQUFLLENBQUM7b0JBQ3RCLGtCQUFrQixHQUFHLENBQUMsQ0FBQztvQkFFdkIsVUFBVSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7b0JBRXpELE1BQU0sQ0FBQyxLQUFLLENBQUM7Z0JBQ2pCLENBQUM7Z0JBRUQsdUJBQXVCLEVBQUU7b0JBQ3JCLGFBQWEsR0FBRyxLQUFLLENBQUM7b0JBQ3RCLGFBQWEsR0FBRyxJQUFJLENBQUM7Z0JBQ3pCLENBQUM7Z0JBRUQsbUJBQW1CLENBQUM7b0JBQ2hCLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztvQkFHbkMsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLE9BQU8sSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQ2pGLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO3dCQUVwQixFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7NEJBQ25CLGdCQUFnQixDQUFDLE1BQU0sRUFBRTtnQ0FDckIsTUFBTSxFQUFFO29DQUNKLE1BQU0sRUFBRSxRQUFRO29DQUNoQixLQUFLLEVBQUUsYUFBYTtvQ0FDcEIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO2lDQUNuQzs2QkFDSixDQUFDLENBQUM7d0JBQ1AsQ0FBQztvQkFFTCxDQUFDO29CQUFDLElBQUksQ0FDRixFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLElBQUksT0FBTyxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVzt3QkFDekYsT0FBTyxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxJQUFJLE9BQU8sSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7d0JBRXpGLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO3dCQUdwQixJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsRUFDM0MsR0FBRyxHQUFHLENBQUMsT0FBTyxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLE9BQU8sSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDMUcsZ0JBQWdCLEdBQUcsYUFBYSxHQUFHLEdBQUcsQ0FBQzt3QkFHM0MsVUFBVSxDQUFDLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQ2hGLENBQUM7Z0JBQ1QsQ0FBQztnQkFFRCxtQkFBbUIsS0FBSztvQkFFcEIsSUFBSSxLQUFLLEVBQ0wsWUFBWSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQyxDQUFDO29CQUUxRCxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUdwQyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzVCLGFBQWEsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQ3BDLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQzt3QkFDNUMsVUFBVSxDQUFDLEVBQUUsU0FBUyxFQUFFLGFBQWEsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDbEYsQ0FBQztnQkFDTCxDQUFDO2dCQUVELG9CQUFvQixLQUFLO29CQUNyQixRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxhQUFhLEdBQUcsUUFBUSxDQUFDLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUNsRixDQUFDO1lBQ0wsQ0FBQztTQUNKLENBQUM7SUFDTixDQUFDLENBQUMsQ0FBQztBQUVQLENBQUMsQ0FBQyxFQUFFLENBQUM7O0FDbFZMLENBQUM7SUFDRyxZQUFZLENBQUM7SUFFYixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRXpELFVBQVUsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxPQUFPLEVBQUUsVUFBVTtRQUNuRSxNQUFNLENBQUM7WUFDSCxRQUFRLEVBQUUsSUFBSTtZQUNkLEtBQUssRUFBRTtnQkFDSCx1QkFBdUIsRUFBRSw2QkFBNkI7Z0JBQ3RELHFCQUFxQixFQUFFLDJCQUEyQjtnQkFDbEQsVUFBVSxFQUFFLDhCQUE4QjtnQkFDMUMsV0FBVyxFQUFFLCtCQUErQjthQUMvQztZQUNELElBQUksRUFBRSxVQUFTLE1BQVc7Z0JBRXRCLE9BQU8sQ0FBQyxjQUFjLEdBQUc7b0JBQ3JCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDbkMsVUFBVSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7d0JBQzVCLE1BQU0sQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUM7b0JBQ3hDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDO2dCQUVGLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxLQUFLO29CQUMzRCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNyRixVQUFVLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQzt3QkFDM0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO3dCQUMxRCxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQzNCLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUMzRCxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUVILE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFO29CQUNuQixPQUFPLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztvQkFDOUIsVUFBVSxFQUFFLENBQUM7Z0JBQ2pCLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztTQUNKLENBQUM7SUFDTixDQUFDLENBQUMsQ0FBQztBQUVQLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwi77u/LyoqXHJcbiAqIEBmaWxlIFJlZ2lzdHJhdGlvbiBvZiBhbGwgV2ViVUkgbGlzdCBjb250cm9sc1xyXG4gKiBAY29weXJpZ2h0IERpZ2l0YWwgTGl2aW5nIFNvZnR3YXJlIENvcnAuIDIwMTQtMjAxNlxyXG4gKi9cclxuXHJcbi8qIGdsb2JhbCBhbmd1bGFyICovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCdwaXBCZWhhdmlvcnMnLCBbXHJcbiAgICAgICAgJ3BpcEZvY3VzZWQnLFxyXG4gICAgICAgICdwaXBTZWxlY3RlZCcsXHJcbiAgICAgICAgJ3BpcEluZmluaXRlU2Nyb2xsJyxcclxuICAgICAgICAncGlwVW5zYXZlZENoYW5nZXMnLFxyXG4gICAgICAgICdwaXBEcmFnZ2FibGUnLFxyXG4gICAgICAgICdwaXBTaG9ydGN1dHMnXHJcbiAgICBdKTtcclxuICAgIFxyXG59KSgpOyIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIHRoaXNNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShcInBpcERyYWdnYWJsZVwiLCBbXSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5zZXJ2aWNlKCdwaXBEcmFnZ2FibGUnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XHJcbiAgICAgICAgc2NvcGUuaW5wdXRFdmVudCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoZXZlbnQudG91Y2hlcykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudC50b3VjaGVzWzBdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vQ2hlY2tpbmcgYm90aCBpcyBub3QgcmVkdW5kZW50LiBJZiBvbmx5IGNoZWNrIGlmIHRvdWNoZXMgaXNEZWZpbmVkLCBhbmd1bGFyanMgaXNEZWZuaWVkIHdpbGwgcmV0dXJuIGVycm9yIGFuZCBzdG9wIHRoZSByZW1haW5pbmcgc2NyaXB0eSBpZiBldmVudC5vcmlnaW5hbEV2ZW50IGlzIG5vdCBkZWZpbmVkLlxyXG4gICAgICAgICAgICBlbHNlIGlmIChhbmd1bGFyLmlzRGVmaW5lZChldmVudC5vcmlnaW5hbEV2ZW50KSAmJiBhbmd1bGFyLmlzRGVmaW5lZChldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBldmVudDtcclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBEcmFnJyxcclxuICAgICAgICBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHBhcnNlLCAkZG9jdW1lbnQsICR3aW5kb3csIHBpcERyYWdnYWJsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG5cclxuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGU6IGFueSwgZWxlbWVudCwgYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZhbHVlID0gYXR0cnMubmdEcmFnO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBMT05HX1BSRVNTID0gNTA7IC8vIDUwbXMgZm9yIGxvbmdwcmVzc1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvZmZzZXQsIF9jZW50ZXJBbmNob3IgPSBmYWxzZSwgX214LCBfbXksIF90eCwgX3R5LCBfbXJ4LCBfbXJ5O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfaGFzVG91Y2ggPSAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KSB8fCAoPGFueT53aW5kb3cpLkRvY3VtZW50VG91Y2g7IC8vICYmIGRvY3VtZW50IGluc3RhbmNlb2YgRG9jdW1lbnRUb3VjaDsgLy8gRG9jdW1lbnRUb3VjaCBpcyBub3QgZGVmaW5lZCFcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX3ByZXNzRXZlbnRzID0gJ3RvdWNoc3RhcnQgbW91c2Vkb3duJztcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX21vdmVFdmVudHMgPSAndG91Y2htb3ZlIG1vdXNlbW92ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9yZWxlYXNlRXZlbnRzID0gJ3RvdWNoZW5kIG1vdXNldXAnO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZHJhZ0hhbmRsZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdG8gaWRlbnRpZnkgdGhlIGVsZW1lbnQgaW4gb3JkZXIgdG8gcHJldmVudCBnZXR0aW5nIHN1cGVyZmxvdXMgZXZlbnRzIHdoZW4gYSBzaW5nbGUgZWxlbWVudCBoYXMgYm90aCBkcmFnIGFuZCBkcm9wIGRpcmVjdGl2ZXMgb24gaXQuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9teWlkID0gc2NvcGUuJGlkO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZGF0YSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZHJhZ09mZnNldCA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZHJhZ0VuYWJsZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9wcmVzc1RpbWVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9lbGVtZW50U3R5bGU6IGFueSA9IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3RhcnRDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RhcnQpIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N0b3BDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RvcCkgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3VjY2Vzc0NhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdWNjZXNzKSB8fCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhbGxvd1RyYW5zZm9ybSA9IGFuZ3VsYXIuaXNEZWZpbmVkKGF0dHJzLmFsbG93VHJhbnNmb3JtKSA/IHNjb3BlLiRldmFsKGF0dHJzLmFsbG93VHJhbnNmb3JtKSA6IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0RHJhZ0RhdGEgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNhbFNjcm9sbCA9IHRvQm9vbGVhbihhdHRycy5waXBWZXJ0aWNhbFNjcm9sbCkgfHwgdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXpvbnRhbFNjcm9sbCA9IHRvQm9vbGVhbihhdHRycy5waXBIb3Jpem9udGFsU2Nyb2xsKSB8fCB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmF0aW9uRGlzdGFuY2UgPSBwYXJzZUZsb2F0KGF0dHJzLnBpcEFjdGl2YXRpb25EaXN0YW5jZSkgfHwgNzUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbERpc3RhbmNlID0gcGFyc2VGbG9hdChhdHRycy5waXBTY3JvbGxEaXN0YW5jZSkgfHwgNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFBhcmVudCA9IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHdpbmRvdyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lckdldHRlciA9ICRwYXJzZShhdHRycy5waXBTY3JvbGxDb250YWluZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBkZXJlZ2lzdHJhdGlvbiBmdW5jdGlvbiBmb3IgbW91c2UgbW92ZSBldmVudHMgaW4gJHJvb3RTY29wZSB0cmlnZ2VyZWQgYnkganFMaXRlIHRyaWdnZXIgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSBhbmd1bGFyLm5vb3A7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cigncGlwLWRyYWdnYWJsZScsICdmYWxzZScpOyAvLyBwcmV2ZW50IG5hdGl2ZSBkcmFnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiBkcmFnIGhhbmRsZShzKSB3YXMgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHF1ZXJ5U2VsZWN0b3JBbGwgaXMgYXZhaWxhYmxlLCB3ZSB1c2UgdGhpcyBpbnN0ZWFkIG9mIGZpbmRcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgSlFMaXRlIGZpbmQgaXMgbGltaXRlZCB0byB0YWduYW1lc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZHJhZ0hhbmRsZXM6IGFueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRbMF0ucXVlcnlTZWxlY3RvckFsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0hhbmRsZXMgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yQWxsKCdbcGlwLWRyYWctaGFuZGxlXScpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdIYW5kbGVzID0gZWxlbWVudC5maW5kKCdbcGlwLWRyYWctaGFuZGxlXScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkcmFnSGFuZGxlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnSGFuZGxlID0gZHJhZ0hhbmRsZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY3JvbGwgY29udGFpbmVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxQYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChlbGVtZW50LnBhcmVudCgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhdHRycy5waXBTY3JvbGxDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChzY3JvbGxDb250YWluZXJHZXR0ZXIoc2NvcGUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b0Jvb2xlYW4odmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09ICcxJyB8fCB2YWx1ZSA9PSAndHJ1ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZW5hYmxlKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGxpc3RlbmVycy5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBvbkRlc3Ryb3kpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goYXR0cnMucGlwRHJhZywgb25FbmFibGVDaGFuZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goYXR0cnMucGlwQ2VudGVyQW5jaG9yLCBvbkNlbnRlckFuY2hvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdpcmUgdXAgdG91Y2ggZXZlbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfZHJhZ0hhbmRsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlKHMpIHNwZWNpZmllZCwgdXNlIHRob3NlIHRvIGluaXRpYXRlIGRyYWdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnSGFuZGxlLm9uKF9wcmVzc0V2ZW50cywgb25wcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBubyBoYW5kbGUocykgc3BlY2lmaWVkLCB1c2UgdGhlIGVsZW1lbnQgYXMgdGhlIGhhbmRsZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5vbihfcHJlc3NFdmVudHMsIG9ucHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2hhc1RvdWNoICYmIGVsZW1lbnRbMF0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSBcImltZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7IC8vIHByZXZlbnQgbmF0aXZlIGRyYWcgZm9yIGltYWdlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRGVzdHJveShlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRW5hYmxlQ2hhbmdlKG5ld1ZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnRW5hYmxlZCA9IChuZXdWYWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25DZW50ZXJBbmNob3IobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKG5ld1ZhbCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2VudGVyQW5jaG9yID0gKG5ld1ZhbCB8fCAndHJ1ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaXNDbGlja2FibGVFbGVtZW50KGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5pc0RlZmluZWQoYW5ndWxhci5lbGVtZW50KGV2dC50YXJnZXQpLmF0dHIoXCJwaXAtY2FuY2VsLWRyYWdcIikpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvKlxyXG4gICAgICAgICAgICAgICAgICAgICAqIFdoZW4gdGhlIGVsZW1lbnQgaXMgY2xpY2tlZCBzdGFydCB0aGUgZHJhZyBiZWhhdmlvdXJcclxuICAgICAgICAgICAgICAgICAgICAgKiBPbiB0b3VjaCBkZXZpY2VzIGFzIGEgc21hbGwgZGVsYXkgc28gYXMgbm90IHRvIHByZXZlbnQgbmF0aXZlIHdpbmRvdyBzY3JvbGxpbmdcclxuICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbnByZXNzKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClyZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDbGlja2FibGVFbGVtZW50KGV2dCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dC50eXBlID09IFwibW91c2Vkb3duXCIgJiYgZXZ0LmJ1dHRvbiAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEbyBub3Qgc3RhcnQgZHJhZ2dpbmcgb24gcmlnaHQtY2xpY2tcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZUVsZW1lbnRTdHlsZXMoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfaGFzVG91Y2gpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcHJlc3NUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25sb25ncHJlc3MoZXZ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIExPTkdfUFJFU1MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKF9tb3ZlRXZlbnRzLCBjYW5jZWxQcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX3JlbGVhc2VFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubG9uZ3ByZXNzKGV2dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBzYXZlRWxlbWVudFN0eWxlcygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS5sZWZ0ID0gZWxlbWVudC5jc3MoJ2NzcycpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lbGVtZW50U3R5bGUudG9wID0gZWxlbWVudC5jc3MoJ3RvcCcpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lbGVtZW50U3R5bGUucG9zaXRpb24gPSBlbGVtZW50LmNzcygncG9zaXRpb24nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS53aWR0aCA9IGVsZW1lbnQuY3NzKCd3aWR0aCcpOyAgICBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNhbmNlbFByZXNzKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3ByZXNzVGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub2ZmKF9tb3ZlRXZlbnRzLCBjYW5jZWxQcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vZmYoX3JlbGVhc2VFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ubG9uZ3ByZXNzKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFsbG93VHJhbnNmb3JtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdPZmZzZXQgPSBvZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdPZmZzZXQgPSB7bGVmdDogZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0LCB0b3A6IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8YW55PmVsZW1lbnQpLmNlbnRlclggPSBlbGVtZW50WzBdLm9mZnNldFdpZHRoIC8gMjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxhbnk+ZWxlbWVudCkuY2VudGVyWSA9IGVsZW1lbnRbMF0ub2Zmc2V0SGVpZ2h0IC8gMjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9teCA9IHBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9teSA9IHBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9tcnggPSBfbXggLSBvZmZzZXQubGVmdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX21yeSA9IF9teSAtIG9mZnNldC50b3A7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfY2VudGVyQW5jaG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHggPSBfbXggLSAoPGFueT5lbGVtZW50KS5jZW50ZXJYIC0gJHdpbmRvdy5wYWdlWE9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eSA9IF9teSAtICg8YW55PmVsZW1lbnQpLmNlbnRlclkgLSAkd2luZG93LnBhZ2VZT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R4ID0gX214IC0gX21yeCAtICR3aW5kb3cucGFnZVhPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHkgPSBfbXkgLSBfbXJ5IC0gJHdpbmRvdy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKF9tb3ZlRXZlbnRzLCBvbm1vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX3JlbGVhc2VFdmVudHMsIG9ucmVsZWFzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgZXZlbnQgaXMgdXNlZCB0byByZWNlaXZlIG1hbnVhbGx5IHRyaWdnZXJlZCBtb3VzZSBtb3ZlIGV2ZW50c1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBqcUxpdGUgdW5mb3J0dW5hdGVseSBvbmx5IHN1cHBvcnRzIHRyaWdnZXJIYW5kbGVyKC4uLilcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VlIGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS90cmlnZ2VySGFuZGxlci9cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJ2RyYWdnYWJsZTpfdHJpZ2dlckhhbmRsZXJNb3ZlJywgb25tb3ZlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJ2RyYWdnYWJsZTpfdHJpZ2dlckhhbmRsZXJNb3ZlJywgZnVuY3Rpb24gKGV2ZW50LCBvcmlnRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubW92ZShvcmlnRXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ubW92ZShldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJhZ0VuYWJsZWQpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZWxlbWVudC5oYXNDbGFzcygncGlwLWRyYWdnaW5nJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kYXRhID0gZ2V0RHJhZ0RhdGEoc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTpzdGFydCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBfbXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogX215LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR4OiBfdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHk6IF90eSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogX2RhdGFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkRyYWdTdGFydENhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnU3RhcnRDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBfZGF0YSwgJGV2ZW50OiBldnR9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX214ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX215ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChob3Jpem9udGFsU2Nyb2xsIHx8IHZlcnRpY2FsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnVG9TY3JvbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9jZW50ZXJBbmNob3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eCA9IF9teCAtICg8YW55PmVsZW1lbnQpLmNlbnRlclggLSBfZHJhZ09mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R5ID0gX215IC0gKDxhbnk+ZWxlbWVudCkuY2VudGVyWSAtIF9kcmFnT2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eCA9IF9teCAtIF9tcnggLSBfZHJhZ09mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R5ID0gX215IC0gX21yeSAtIF9kcmFnT2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZUVsZW1lbnQoX3R4LCBfdHkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdkcmFnZ2FibGU6bW92ZScsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IF9teCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IF9teSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR4OiBfdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eTogX3R5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGV2dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBfZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpZDogX215aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnT2Zmc2V0OiBfZHJhZ09mZnNldFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ucmVsZWFzZShldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJhZ0VuYWJsZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTplbmQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBfbXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBfbXksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eDogX3R4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHk6IF90eSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBldnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogX2RhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogb25EcmFnQ29tcGxldGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aWQ6IF9teWlkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnQoKS5maW5kKCcucGlwLWRyYWctZW50ZXInKS5yZW1vdmVDbGFzcygncGlwLWRyYWctZW50ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzZXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9mZihfbW92ZUV2ZW50cywgb25tb3ZlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9mZihfcmVsZWFzZUV2ZW50cywgb25yZWxlYXNlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkRyYWdTdG9wQ2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnU3RvcENhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IF9kYXRhLCAkZXZlbnQ6IGV2dH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnQ29tcGxldGUoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb25EcmFnU3VjY2Vzc0NhbGxiYWNrKXJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdWNjZXNzQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogX2RhdGEsICRldmVudDogZXZ0fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVzZXQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbGxvd1RyYW5zZm9ybSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHt0cmFuc2Zvcm06ICcnLCAnei1pbmRleCc6ICcnLCAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnJywgJy1tcy10cmFuc2Zvcm0nOiAnJ30pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHsncG9zaXRpb24nOiBfZWxlbWVudFN0eWxlLnBvc2l0aW9uLCB0b3A6IF9lbGVtZW50U3R5bGUudG9wLCBsZWZ0OiBfZWxlbWVudFN0eWxlLmxlZnQsICd6LWluZGV4JzogJycsIHdpZHRoOiBfZWxlbWVudFN0eWxlLndpZHRofSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG1vdmVFbGVtZW50KHgsIHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVXaWR0aCA9IGVsZW1lbnQuY3NzKCd3aWR0aCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWxsb3dUcmFuc2Zvcm0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06ICdtYXRyaXgzZCgxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAnICsgeCArICcsICcgKyB5ICsgJywgMCwgMSknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd6LWluZGV4JzogOTk5OTksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJy13ZWJraXQtdHJhbnNmb3JtJzogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJy1tcy10cmFuc2Zvcm0nOiAnbWF0cml4KDEsIDAsIDAsIDEsICcgKyB4ICsgJywgJyArIHkgKyAnKSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsZWZ0JzogeCArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RvcCc6IHkgKyAncHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdwb3NpdGlvbic6ICdmaXhlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiAxMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGVXaWR0aFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGRyYWdUb1Njcm9sbCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjcm9sbFggPSAwLCBzY3JvbGxZID0gMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0KCkgfHwge2xlZnQ6IDAsIHRvcDogMH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhvcml6b250YWxTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckxlZnQgPSBvZmZzZXQoc2Nyb2xsQ29udGFpbmVyKS5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcldpZHRoID0gc2Nyb2xsQ29udGFpbmVyLmlubmVyV2lkdGgoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJSaWdodCA9IGNvbnRhaW5lckxlZnQgKyBjb250YWluZXJXaWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKF9teCAtIGNvbnRhaW5lckxlZnQpIDwgYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWCA9IC1zY3JvbGxEaXN0YW5jZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKChjb250YWluZXJSaWdodCAtIF9teCkgPCBhY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxYID0gc2Nyb2xsRGlzdGFuY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ZXJ0aWNhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyVG9wID0gb2Zmc2V0KHNjcm9sbENvbnRhaW5lcikudG9wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IHNjcm9sbENvbnRhaW5lci5pbm5lckhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IGNvbnRhaW5lclRvcCArIGNvbnRhaW5lckhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKF9teSAtIGNvbnRhaW5lclRvcCkgPCBhY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxZID0gLXNjcm9sbERpc3RhbmNlICsgMzA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgoY29udGFpbmVyQm90dG9tIC0gX215KSA8IGFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFkgPSBzY3JvbGxEaXN0YW5jZSAtIDMwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxYICE9PSAwIHx8IHNjcm9sbFkgIT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbExlZnQgPSBzY3JvbGxDb250YWluZXIuc2Nyb2xsTGVmdCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbFRvcCA9IHNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIuc2Nyb2xsTGVmdChjb250YWluZXJTY3JvbGxMZWZ0ICsgc2Nyb2xsWCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIHNjcm9sbFkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBEcm9wJywgXHJcbiAgICAgICAgZnVuY3Rpb24gKCRwYXJzZSwgJHRpbWVvdXQsICR3aW5kb3csICRkb2N1bWVudCwgcGlwRHJhZ2dhYmxlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlOiBhbnksIGVsZW1lbnQsIGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLnZhbHVlID0gYXR0cnMucGlwRHJvcDtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmlzVG91Y2hpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgX2xhc3REcm9wVG91Y2ggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdmFyIF9teWlkID0gc2NvcGUuJGlkO1xyXG4gICAgICAgICAgICAgICAgdmFyIF9kcm9wRW5hYmxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBvbkRyb3BDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcm9wU3VjY2Vzcyk7Ly8gfHwgZnVuY3Rpb24oKXt9O1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N0YXJ0Q2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N0YXJ0KTtcclxuICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdG9wQ2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N0b3ApO1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJhZ01vdmVDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnTW92ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZW5hYmxlKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5waXBEcm9wLCBvbkVuYWJsZUNoYW5nZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIG9uRGVzdHJveSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6c3RhcnQnLCBvbkRyYWdTdGFydCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6bW92ZScsIG9uRHJhZ01vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRvbignZHJhZ2dhYmxlOmVuZCcsIG9uRHJhZ0VuZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EZXN0cm95KGVuYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyhmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICBfZHJvcEVuYWJsZWQgPSBuZXdWYWw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnU3RhcnQoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcm9wRW5hYmxlZClyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLnBpcERyYWdTdGFydCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdGFydENhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IG9iai5kYXRhLCAkZXZlbnQ6IG9ian0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnTW92ZShldnQsIG9iaikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX2Ryb3BFbmFibGVkKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBpc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMucGlwRHJhZ01vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnTW92ZUNhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IG9iai5kYXRhLCAkZXZlbnQ6IG9ian0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnRW5kKGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZG9uJ3QgbGlzdGVuIHRvIGRyb3AgZXZlbnRzIGlmIHRoaXMgaXMgdGhlIGVsZW1lbnQgYmVpbmcgZHJhZ2dlZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgdXBkYXRlIHRoZSBzdHlsZXMgYW5kIHJldHVyblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX2Ryb3BFbmFibGVkIHx8IF9teWlkID09PSBvYmoudWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZURyYWdTdHlsZXMoZmFsc2UsIG9iai5lbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVG91Y2hpbmcob2JqLngsIG9iai55LCBvYmouZWxlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FsbCB0aGUgcGlwRHJhZ2dhYmxlIHBpcERyYWdTdWNjZXNzIGVsZW1lbnQgY2FsbGJhY2tcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai5jYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqLmNhbGxiYWNrKG9iaik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5waXBEcm9wU3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJvcENhbGxiYWNrKHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRkYXRhOiBvYmouZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBvYmosXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0YXJnZXQ6IHNjb3BlLiRldmFsKHNjb3BlLnZhbHVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5waXBEcmFnU3RvcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdG9wQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogb2JqLmRhdGEsICRldmVudDogb2JqfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlRHJhZ1N0eWxlcyhmYWxzZSwgb2JqLmVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGlzVG91Y2hpbmcobW91c2VYLCBtb3VzZVksIGRyYWdFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRvdWNoaW5nID0gaGl0VGVzdChtb3VzZVgsIG1vdXNlWSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaXNUb3VjaGluZyA9IHRvdWNoaW5nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0b3VjaGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbGFzdERyb3BUb3VjaCA9IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZURyYWdTdHlsZXModG91Y2hpbmcsIGRyYWdFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG91Y2hpbmc7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlRHJhZ1N0eWxlcyh0b3VjaGluZywgZHJhZ0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodG91Y2hpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWctZW50ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0VsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1kcmFnLW92ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF9sYXN0RHJvcFRvdWNoID09IGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2xhc3REcm9wVG91Y2ggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnRWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaGl0VGVzdCh4LCB5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJvdW5kcyA9IGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgeCAtPSAkZG9jdW1lbnRbMF0uYm9keS5zY3JvbGxMZWZ0ICsgJGRvY3VtZW50WzBdLmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgIHkgLT0gJGRvY3VtZW50WzBdLmJvZHkuc2Nyb2xsVG9wICsgJGRvY3VtZW50WzBdLmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHggPj0gYm91bmRzLmxlZnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgeCA8PSBib3VuZHMucmlnaHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgeSA8PSBib3VuZHMuYm90dG9tXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIHkgPj0gYm91bmRzLnRvcDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICAvL3RoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBEcmFnQ2xvbmUnLCBmdW5jdGlvbiAoJHBhcnNlLCAkdGltZW91dCwgcGlwRHJhZ2dhYmxlKSB7XHJcbiAgICAvLyAgICByZXR1cm4ge1xyXG4gICAgLy8gICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAvLyAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgLy8gICAgICAgICAgICB2YXIgaW1nLCBfYWxsb3dDbG9uZSA9IHRydWU7XHJcbiAgICAvLyAgICAgICAgICAgIHZhciBfZHJhZ09mZnNldCA9IG51bGw7XHJcbiAgICAvLyAgICAgICAgICAgIHNjb3BlLmNsb25lZERhdGEgPSB7fTtcclxuICAgIC8vICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG4gICAgLy8gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaW1nID0gZWxlbWVudC5maW5kKCdpbWcnKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cigncGlwLWRyYWdnYWJsZScsICdmYWxzZScpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaW1nLmF0dHIoJ2RyYWdnYWJsZScsICdmYWxzZScpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgcmVzZXQoKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuICAgIC8vICAgICAgICAgICAgfVxyXG4vL1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgICAgICBpZiAoIWVuYWJsZSlyZXR1cm47XHJcbiAgICAvLyAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG4gICAgLy8gICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6c3RhcnQnLCBvbkRyYWdTdGFydCk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTptb3ZlJywgb25EcmFnTW92ZSk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTplbmQnLCBvbkRyYWdFbmQpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgcHJldmVudENvbnRleHRNZW51KCk7XHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIHByZXZlbnRDb250ZXh0TWVudSgpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIC8vICBlbGVtZW50Lm9mZignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGltZy5vZmYoJ21vdXNlZG93biB0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIGFic29yYkV2ZW50Xyk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAvLyAgZWxlbWVudC5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGltZy5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgIC8vICAgICAgICAgICAgfVxyXG5cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnU3RhcnQoZXZ0LCBvYmosIGVsbSkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgX2FsbG93Q2xvbmUgPSB0cnVlO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKG9iai5kYXRhLmFsbG93Q2xvbmUpKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgX2FsbG93Q2xvbmUgPSBvYmouZGF0YS5hbGxvd0Nsb25lO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgfVxyXG4gICAgLy8gICAgICAgICAgICAgICAgaWYgKF9hbGxvd0Nsb25lKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuY2xvbmVkRGF0YSA9IG9iai5kYXRhO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKCd3aWR0aCcsIG9iai5lbGVtZW50WzBdLm9mZnNldFdpZHRoKTtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNzcygnaGVpZ2h0Jywgb2JqLmVsZW1lbnRbMF0ub2Zmc2V0SGVpZ2h0KTtcclxuLy9cclxuICAgIC8vICAgICAgICAgICAgICAgICAgICBtb3ZlRWxlbWVudChvYmoudHgsIG9iai50eSk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICB9XHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIG9uRHJhZ01vdmUoZXZ0LCBvYmopIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIGlmIChfYWxsb3dDbG9uZSkge1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIF90eCA9IG9iai50eCArIG9iai5kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgX3R5ID0gb2JqLnR5ICsgb2JqLmRyYWdPZmZzZXQudG9wO1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIG1vdmVFbGVtZW50KF90eCwgX3R5KTtcclxuICAgIC8vICAgICAgICAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgICAgfVxyXG5cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnRW5kKGV2dCwgb2JqKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAvL21vdmVFbGVtZW50KG9iai50eCxvYmoudHkpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaWYgKF9hbGxvd0Nsb25lKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgcmVzZXQoKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgICAgfVxyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiByZXNldCgpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHtsZWZ0OiAwLCB0b3A6IDAsIHBvc2l0aW9uOiAnZml4ZWQnLCAnei1pbmRleCc6IC0xLCB2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xyXG4gICAgLy8gICAgICAgICAgICB9XHJcblxyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiBtb3ZlRWxlbWVudCh4LCB5KSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBlbGVtZW50LmNzcyh7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiAnbWF0cml4M2QoMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgJyArIHggKyAnLCAnICsgeSArICcsIDAsIDEpJyxcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6IDk5OTk5LFxyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICd2aXNpYmlsaXR5JzogJ3Zpc2libGUnLFxyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICctd2Via2l0LXRyYW5zZm9ybSc6ICdtYXRyaXgzZCgxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAnICsgeCArICcsICcgKyB5ICsgJywgMCwgMSknLFxyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICctbXMtdHJhbnNmb3JtJzogJ21hdHJpeCgxLCAwLCAwLCAxLCAnICsgeCArICcsICcgKyB5ICsgJyknXHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgLy8sbWFyZ2luOiAnMCcgIGRvbid0IG1vbmtleSB3aXRoIHRoZSBtYXJnaW4sXHJcbiAgICAvLyAgICAgICAgICAgICAgICB9KTtcclxuICAgIC8vICAgICAgICAgICAgfVxyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiBhYnNvcmJFdmVudF8oZXZlbnQpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIHZhciBlID0gZXZlbnQ7Ly8ub3JpZ2luYWxFdmVudDtcclxuICAgIC8vICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQgJiYgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24gJiYgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcclxuICAgIC8vICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIC8vICAgICAgICAgICAgfVxyXG4vL1xyXG4gICAgLy8gICAgICAgIH1cclxuICAgIC8vICAgIH07XHJcbiAgICAvL30pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBQcmV2ZW50RHJhZycsIGZ1bmN0aW9uICgkcGFyc2UsICR0aW1lb3V0KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlOiBhbnksIGVsZW1lbnQsIGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBhYnNvcmJFdmVudF8oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCAmJiBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24gJiYgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwQ2FuY2VsRHJhZycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmZpbmQoJyonKS5hdHRyKCdwaXAtY2FuY2VsLWRyYWcnLCAncGlwLWNhbmNlbC1kcmFnJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcblxyXG4iLCIvKipcclxuICogQGZpbGUgS2V5Ym9hcmQgbmF2aWdhdGlvbiBvdmVyIGZldyBmb2N1c2FibGUgY29udHJvbHNcclxuICogQGNvcHlyaWdodCBEaWdpdGFsIExpdmluZyBTb2Z0d2FyZSBDb3JwLiAyMDE0LTIwMTZcclxuICovXHJcblxyXG4vKiBnbG9iYWwgYW5ndWxhciAqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwRm9jdXNlZFwiLCBbXSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcEZvY3VzZWQnLCBmdW5jdGlvbiAoJHRpbWVvdXQsICRtZENvbnN0YW50LCAkd2luZG93KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgLy8gcmVzdHJpY3Q6ICdFQScsXHJcbiAgICAgICAgICAgIHJlcXVpcmU6IFwiP25nTW9kZWxcIixcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZTogYW55LCAkZWxlbWVudCwgJGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBjb250cm9scywgY29udHJvbHNMZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgd2l0aEhpZGRlbiA9ICRhdHRycy5waXBXaXRoSGlkZGVuLFxyXG4gICAgICAgICAgICAgICAgICAgIG9wYWNpdHlEZWx0YSA9IDAuNCxcclxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5TGltaXQgPSAwLjUsXHJcbiAgICAgICAgICAgICAgICAgICAgX2NvbG9yLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvY3VzZWRDb2xvciA9ICRhdHRycy5waXBGb2N1c2VkQ29sb3IgPyAkYXR0cnMucGlwRm9jdXNlZENvbG9yIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICByZUluaXQgPSAkYXR0cnMucGlwRm9jdXNlZFJlYmluZCA/ICRhdHRycy5waXBGb2N1c2VkUmViaW5kIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBmb2N1c2VkVGFiaW5kZXggPSAkYXR0cnMucGlwRm9jdXNlZFRhYmluZGV4ID8gcGFyc2VJbnQoJGF0dHJzLnBpcEZvY3VzZWRUYWJpbmRleCkgfHwgMCA6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNPcGFjaXR5ID0gJGF0dHJzLnBpcEZvY3VzZWRPcGFjaXR5ID8gdG9Cb29sZWFuKCRhdHRycy5waXBGb2N1c2VkT3BhY2l0eSkgOiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAkdGltZW91dChpbml0KTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdrZXlkb3duJywga2V5ZG93bkxpc3RlbmVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoJGF0dHJzLm5nTW9kZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCRhdHRycy5uZ01vZGVsLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGluaXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICgkYXR0cnMucGlwRm9jdXNlZERhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAkYXR0cnMuJG9ic2VydmUoJ3BpcEZvY3VzZWREYXRhJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChpbml0KTtcclxuICAgICAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIH0gICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIENvbnZlcnRzIHZhbHVlIGludG8gYm9vbGVhblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdG9Cb29sZWFuKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09ICcxJyB8fCB2YWx1ZSA9PSAndHJ1ZSc7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJnYmEoY29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZm9jdXNlZENvbG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmb2N1c2VkQ29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXJyID0gY29sb3Iuc3BsaXQoXCIoXCIpWzFdLnNwbGl0KFwiKVwiKVswXS5zcGxpdChcIixcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghYXJyIHx8IGFyci5sZW5ndGggPCAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlZCwgYmx1ZSwgZ3JlZW4sIG9wYWNpdHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIG9wYWNpdHkgPSBhcnIubGVuZ3RoID09IDMgPyAxIDogcGFyc2VGbG9hdChhcnJbM10pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlZCA9IGFyclswXTtcclxuICAgICAgICAgICAgICAgICAgICBibHVlID0gYXJyWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIGdyZWVuID0gYXJyWzJdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BhY2l0eSA8IG9wYWNpdHlMaW1pdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5ICs9IG9wYWNpdHlEZWx0YTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5IC09IG9wYWNpdHlEZWx0YTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAncmdiYSgnICsgcmVkICsgJywgJyArIGJsdWUgKyAnLCAnICsgZ3JlZW4gKyAnLCAnICsgb3BhY2l0eSArICcpJztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzZXRUYWJpbmRleChlbGVtZW50LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tUYWJpbmRleChjb250cm9scykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmRleCA9IF8uZmluZEluZGV4KGNvbnRyb2xzLCAoYykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY1sndGFiaW5kZXgnXSA+IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT0gLTEgJiYgY29udHJvbHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgZWwgPSBjb250cm9sc1swXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGFiaW5kZXgoYW5ndWxhci5lbGVtZW50KGNvbnRyb2xzWzBdKSwgZm9jdXNlZFRhYmluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSB3aXRoSGlkZGVuID8gJy5waXAtZm9jdXNhYmxlJyA6ICcucGlwLWZvY3VzYWJsZTp2aXNpYmxlJztcclxuICAgICAgICAgICAgICAgICAgICBjb250cm9scyA9ICRlbGVtZW50LmZpbmQoc2VsZWN0b3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzTGVuZ3RoID0gY29udHJvbHMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrVGFiaW5kZXgoY29udHJvbHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBuZWVkZWQgZXZlbnQgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbHMub24oJ2ZvY3VzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5oYXNDbGFzcygnbWQtZm9jdXNlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlSW5pdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzT3BhY2l0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVsbCA9IGFuZ3VsYXIuZWxlbWVudCgkKHRoaXMpWzBdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY29sb3IgPSAkKHRoaXMpLmNzcygnYmFja2dyb3VuZENvbG9yJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBfY29sb3IgPSAkd2luZG93LmdldENvbXB1dGVkU3R5bGUoJCh0aGlzKVswXSwgbnVsbCkuYmFja2dyb3VuZENvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIHJnYmEoX2NvbG9yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdtZC1mb2N1c2VkIG1kLWZvY3VzZWQtb3BhY2l0eScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZXRUYWJpbmRleChhbmd1bGFyLmVsZW1lbnQoJCh0aGlzKVswXSksIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pLm9uKCdmb2N1c291dCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEkKHRoaXMpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWZvY3VzZWQtY29udGFpbmVyJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNPcGFjaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAkKHRoaXMpLmNzcygnYmFja2dyb3VuZENvbG9yJywgX2NvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCBcIlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQgbWQtZm9jdXNlZC1vcGFjaXR5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgSSBnbyBmcm9tIGJsb2NrIGFsbCBlbGVtZW50IGhhdmUgdGFiaW5kZXggPSAtMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZXRUYWJpbmRleChhbmd1bGFyLmVsZW1lbnQoJCh0aGlzKVswXSksIC0xKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBrZXlkb3duTGlzdGVuZXIoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlDb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgY29udHJvbCBrZXlDb2RlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuTEVGVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluY3JlbWVudCA9IChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykgPyAxIDogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb3ZlVG9Db250cm9sID0gY29udHJvbHMuaW5kZXgoY29udHJvbHMuZmlsdGVyKFwiLm1kLWZvY3VzZWRcIikpICsgaW5jcmVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNb3ZlIGZvY3VzIHRvIG5leHQgY29udHJvbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobW92ZVRvQ29udHJvbCA+PSAwICYmIG1vdmVUb0NvbnRyb2wgPCBjb250cm9sc0xlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbHNbbW92ZVRvQ29udHJvbF0uZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbn0pKCk7XHJcblxyXG4iLCIvKipcclxuICogQGZpbGUgSW5maW5pdGUgc2Nyb2xsaW5nIGJlaGF2aW9yXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBNb2RpZmllZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9zcm96ZS9uZ0luZmluaXRlU2Nyb2xsXHJcbiAqIEBjb3B5cmlnaHQgRGlnaXRhbCBMaXZpbmcgU29mdHdhcmUgQ29ycC4gMjAxNC0yMDE2XHJcbiAqL1xyXG5cclxuLyogZ2xvYmFsIGFuZ3VsYXIgKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIHRoaXNNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShcInBpcEluZmluaXRlU2Nyb2xsXCIsIFtdKTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwSW5maW5pdGVTY3JvbGwnLCBcclxuICAgICAgICBmdW5jdGlvbigkcm9vdFNjb3BlLCAkd2luZG93LCAkaW50ZXJ2YWwsICRwYXJzZSkge1xyXG4gICAgICAgICAgICB2YXIgVEhST1RUTEVfTUlMTElTRUNPTkRTID0gNTAwO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGlwSW5maW5pdGVTY3JvbGw6ICcmJyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxDb250YWluZXI6ICc9JyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxEaXN0YW5jZTogJz0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbERpc2FibGVkOiAnPScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b206ICc9JyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxMaXN0ZW5Gb3JFdmVudDogJ0AnXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlOiBhbnksICRlbGVtZW50LCAkYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tXaGVuRW5hYmxlZCA9IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1tZWRpYXRlQ2hlY2sgPSB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxEaXN0YW5jZSA9IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbEVuYWJsZWQgPSBudWxsLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VEb2N1bWVudEJvdHRvbSA9IGZhbHNlLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93RWxlbWVudCA9IGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoZWlnaHQoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXSB8fCBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYU4oZWxlbWVudC5vZmZzZXRIZWlnaHQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb2Zmc2V0VG9wKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCB8fCBlbGVtZW50LmNzcygnbm9uZScpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICsgcGFnZVlPZmZzZXQoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcGFnZVlPZmZzZXQoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXSB8fCBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYU4od2luZG93LnBhZ2VZT2Zmc2V0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50Lm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25Db250YWluZXJTY3JvbGwgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbWFpbmluZywgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRTY3JvbGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsQ29udGFpbmVyID09PSB3aW5kb3dFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBoZWlnaHQoc2Nyb2xsQ29udGFpbmVyKSArIHBhZ2VZT2Zmc2V0KHNjcm9sbENvbnRhaW5lclswXS5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSA9IG9mZnNldFRvcCgkZWxlbWVudCkgKyBoZWlnaHQoJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gaGVpZ2h0KHNjcm9sbENvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9mZnNldFRvcChzY3JvbGxDb250YWluZXIpICE9PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQgPSBvZmZzZXRUb3Aoc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSBvZmZzZXRUb3AoJGVsZW1lbnQpIC0gY29udGFpbmVyVG9wT2Zmc2V0ICsgaGVpZ2h0KCRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVzZURvY3VtZW50Qm90dG9tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gaGVpZ2h0KCgkZWxlbWVudFswXS5vd25lckRvY3VtZW50IHx8ICg8YW55PiRlbGVtZW50WzBdKS5kb2N1bWVudCkuZG9jdW1lbnRFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtYWluaW5nID0gZWxlbWVudEJvdHRvbSAtIGNvbnRhaW5lckJvdHRvbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdWxkU2Nyb2xsID0gcmVtYWluaW5nIDw9IGhlaWdodChzY3JvbGxDb250YWluZXIpICogc2Nyb2xsRGlzdGFuY2UgKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNob3VsZFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tXaGVuRW5hYmxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuJCRwaGFzZSB8fCAkcm9vdFNjb3BlLiQkcGhhc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5waXBJbmZpbml0ZVNjcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuJGFwcGx5KCRzY29wZS5waXBJbmZpbml0ZVNjcm9sbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoZWNrV2hlbkVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChUSFJPVFRMRV9NSUxMSVNFQ09ORFMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNvbnRhaW5lclNjcm9sbCA9IF8udGhyb3R0bGUob25Db250YWluZXJTY3JvbGwsIFRIUk9UVExFX01JTExJU0VDT05EUyk7ICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci51bmJpbmQoJ3Njcm9sbCcsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVucmVnaXN0ZXJFdmVudExpc3RlbmVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucmVnaXN0ZXJFdmVudExpc3RlbmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbERpc3RhbmNlKHYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjcm9sbERpc3RhbmNlID0gcGFyc2VGbG9hdCh2KSB8fCAwO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsRGlzdGFuY2UnLCBoYW5kbGVTY3JvbGxEaXN0YW5jZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsRGlzdGFuY2UoJHNjb3BlLnBpcFNjcm9sbERpc3RhbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVTY3JvbGxEaXNhYmxlZCh2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbEVuYWJsZWQgPSAhdjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbEVuYWJsZWQgJiYgY2hlY2tXaGVuRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tXaGVuRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9uQ29udGFpbmVyU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbERpc2FibGVkJywgaGFuZGxlU2Nyb2xsRGlzYWJsZWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZVNjcm9sbERpc2FibGVkKCRzY29wZS5waXBTY3JvbGxEaXNhYmxlZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKHYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZURvY3VtZW50Qm90dG9tID0gdjtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tJywgaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20pO1xyXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKCRzY29wZS5waXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoYW5nZUNvbnRhaW5lcihuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbENvbnRhaW5lciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIudW5iaW5kKCdzY3JvbGwnLCBvbkNvbnRhaW5lclNjcm9sbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IG5ld0NvbnRhaW5lcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2Nyb2xsQ29udGFpbmVyLmJpbmQoJ3Njcm9sbCcsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZUNvbnRhaW5lcih3aW5kb3dFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnBpcFNjcm9sbExpc3RlbkZvckV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVucmVnaXN0ZXJFdmVudExpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJHNjb3BlLnBpcFNjcm9sbExpc3RlbkZvckV2ZW50LCBvbkNvbnRhaW5lclNjcm9sbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVTY3JvbGxDb250YWluZXIobmV3Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgobmV3Q29udGFpbmVyID09IG51bGwpIHx8IG5ld0NvbnRhaW5lci5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChuZXdDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBuZXdDb250YWluZXIuYXBwZW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQobmV3Q29udGFpbmVyW25ld0NvbnRhaW5lci5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld0NvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9ICRlbGVtZW50LnBhcmVudHMoKS5maW5kKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIgIT0gbnVsbCAmJiAoIUFycmF5LmlzQXJyYXkobmV3Q29udGFpbmVyKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKEFycmF5LmlzQXJyYXkobmV3Q29udGFpbmVyKSAmJiBuZXdDb250YWluZXIubGVuZ3RoID4gMCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hhbmdlQ29udGFpbmVyKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHBpcC1zY3JvbGwtY29udGFpbmVyIGF0dHJpYnV0ZS5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbENvbnRhaW5lcicsIGZ1bmN0aW9uIChuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPT0gc2Nyb2xsQ29udGFpbmVyKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsQ29udGFpbmVyKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsQ29udGFpbmVyKCRzY29wZS5waXBTY3JvbGxDb250YWluZXIgfHwgW10pO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkYXR0cnMucGlwU2Nyb2xsUGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ29udGFpbmVyKGFuZ3VsYXIuZWxlbWVudCgkZWxlbWVudC5wYXJlbnQoKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoJGF0dHJzLnBpcFNjcm9sSW1tZWRpYXRlQ2hlY2sgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbW1lZGlhdGVDaGVjayA9ICRzY29wZS4kZXZhbCgkYXR0cnMucGlwU2Nyb2xJbW1lZGlhdGVDaGVjayk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkaW50ZXJ2YWwoKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1tZWRpYXRlQ2hlY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvbkNvbnRhaW5lclNjcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSksIDAsIDEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxuXHJcbn0pKCk7XHJcblxyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5leHBvcnQgY2xhc3MgU2hvcnRjdXRPcHRpb24ge1xyXG4gICAgVHlwZTogS2V5Ym9hcmRFdmVudDtcclxuICAgIFByb3BhZ2F0ZTogYm9vbGVhbjtcclxuICAgIERpc2FibGVJbklucHV0OiBib29sZWFuO1xyXG4gICAgVGFyZ2V0OiBhbnk7IC8vIGV2ZW50IHRhcmdldCBvYmplY3RcclxuICAgIEtleWNvZGU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEtleWJvYXJkRXZlbnQge1xyXG4gICAgc3RhdGljIEtleWRvd246IHN0cmluZyA9ICdrZXlkb3duJztcclxuICAgIHN0YXRpYyBLZXl1cDogc3RyaW5nID0gJ2tleXVwJztcclxuICAgIHN0YXRpYyBLZXlwcmVzczogc3RyaW5nID0gJ2tleXByZXNzJztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEtleWJvYXJkU2hvcnRjdXQge1xyXG4gICAgcHJpdmF0ZSBzaGlmdF9udW1zID0ge1xyXG4gICAgICAgIFwiYFwiOiBcIn5cIixcclxuICAgICAgICBcIjFcIjogXCIhXCIsXHJcbiAgICAgICAgXCIyXCI6IFwiQFwiLFxyXG4gICAgICAgIFwiM1wiOiBcIiNcIixcclxuICAgICAgICBcIjRcIjogXCIkXCIsXHJcbiAgICAgICAgXCI1XCI6IFwiJVwiLFxyXG4gICAgICAgIFwiNlwiOiBcIl5cIixcclxuICAgICAgICBcIjdcIjogXCImXCIsXHJcbiAgICAgICAgXCI4XCI6IFwiKlwiLFxyXG4gICAgICAgIFwiOVwiOiBcIihcIixcclxuICAgICAgICBcIjBcIjogXCIpXCIsXHJcbiAgICAgICAgXCItXCI6IFwiX1wiLFxyXG4gICAgICAgIFwiPVwiOiBcIitcIixcclxuICAgICAgICBcIjtcIjogXCI6XCIsXHJcbiAgICAgICAgXCInXCI6IFwiXFxcIlwiLFxyXG4gICAgICAgIFwiLFwiOiBcIjxcIixcclxuICAgICAgICBcIi5cIjogXCI+XCIsXHJcbiAgICAgICAgXCIvXCI6IFwiP1wiLFxyXG4gICAgICAgIFwiXFxcXFwiOiBcInxcIlxyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIHNwZWNpYWxfa2V5cyA9IHtcclxuICAgICAgICAnZXNjJzogMjcsXHJcbiAgICAgICAgJ2VzY2FwZSc6IDI3LFxyXG4gICAgICAgICd0YWInOiA5LFxyXG4gICAgICAgICdzcGFjZSc6IDMyLFxyXG4gICAgICAgICdyZXR1cm4nOiAxMyxcclxuICAgICAgICAnZW50ZXInOiAxMyxcclxuICAgICAgICAnYmFja3NwYWNlJzogOCxcclxuXHJcbiAgICAgICAgJ3Njcm9sbGxvY2snOiAxNDUsXHJcbiAgICAgICAgJ3Njcm9sbF9sb2NrJzogMTQ1LFxyXG4gICAgICAgICdzY3JvbGwnOiAxNDUsXHJcbiAgICAgICAgJ2NhcHNsb2NrJzogMjAsXHJcbiAgICAgICAgJ2NhcHNfbG9jayc6IDIwLFxyXG4gICAgICAgICdjYXBzJzogMjAsXHJcbiAgICAgICAgJ251bWxvY2snOiAxNDQsXHJcbiAgICAgICAgJ251bV9sb2NrJzogMTQ0LFxyXG4gICAgICAgICdudW0nOiAxNDQsXHJcblxyXG4gICAgICAgICdwYXVzZSc6IDE5LFxyXG4gICAgICAgICdicmVhayc6IDE5LFxyXG5cclxuICAgICAgICAnaW5zZXJ0JzogNDUsXHJcbiAgICAgICAgJ2hvbWUnOiAzNixcclxuICAgICAgICAnZGVsZXRlJzogNDYsXHJcbiAgICAgICAgJ2VuZCc6IDM1LFxyXG5cclxuICAgICAgICAncGFnZXVwJzogMzMsXHJcbiAgICAgICAgJ3BhZ2VfdXAnOiAzMyxcclxuICAgICAgICAncHUnOiAzMyxcclxuXHJcbiAgICAgICAgJ3BhZ2Vkb3duJzogMzQsXHJcbiAgICAgICAgJ3BhZ2VfZG93bic6IDM0LFxyXG4gICAgICAgICdwZCc6IDM0LFxyXG5cclxuICAgICAgICAnbGVmdCc6IDM3LFxyXG4gICAgICAgICd1cCc6IDM4LFxyXG4gICAgICAgICdyaWdodCc6IDM5LFxyXG4gICAgICAgICdkb3duJzogNDAsXHJcblxyXG4gICAgICAgICdmMSc6IDExMixcclxuICAgICAgICAnZjInOiAxMTMsXHJcbiAgICAgICAgJ2YzJzogMTE0LFxyXG4gICAgICAgICdmNCc6IDExNSxcclxuICAgICAgICAnZjUnOiAxMTYsXHJcbiAgICAgICAgJ2Y2JzogMTE3LFxyXG4gICAgICAgICdmNyc6IDExOCxcclxuICAgICAgICAnZjgnOiAxMTksXHJcbiAgICAgICAgJ2Y5JzogMTIwLFxyXG4gICAgICAgICdmMTAnOiAxMjEsXHJcbiAgICAgICAgJ2YxMSc6IDEyMixcclxuICAgICAgICAnZjEyJzogMTIzXHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgbW9kaWZpZXJzID0ge1xyXG4gICAgICAgIHNoaWZ0OiB7IHdhbnRlZDogZmFsc2UsIHByZXNzZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgY3RybDogeyB3YW50ZWQ6IGZhbHNlLCBwcmVzc2VkOiBmYWxzZSB9LFxyXG4gICAgICAgIGFsdDogeyB3YW50ZWQ6IGZhbHNlLCBwcmVzc2VkOiBmYWxzZSB9LFxyXG4gICAgICAgIG1ldGE6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfVx0Ly9NZXRhIGlzIE1hYyBzcGVjaWZpY1xyXG4gICAgfTtcclxuXHJcbiAgICBwdWJsaWMgZXZlbnRDYWxsYmFjazogRnVuY3Rpb247XHJcbiAgICBwdWJsaWMgdGFyZ2V0OiBhbnk7XHJcbiAgICBwdWJsaWMgZXZlbnQ6IEtleWJvYXJkRXZlbnQ7XHJcbiAgICBwdWJsaWMgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbjtcclxuICAgIHB1YmxpYyBzaG9yY3V0OiBzdHJpbmc7XHJcbiAgICBwdWJsaWMgY2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICBlbGVtZW50OiBhbnksXHJcbiAgICAgICAgc2hvcmN1dENvbWJpbmF0aW9uOiBzdHJpbmcsXHJcbiAgICAgICAgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbixcclxuICAgICAgICBjYWxsYmFjazogKGU/OiBKUXVlcnlFdmVudE9iamVjdCkgPT4gdm9pZFxyXG4gICAgKSB7XHJcbiAgICAgICAgXCJuZ0luamVjdFwiO1xyXG5cclxuICAgICAgICB0aGlzLnRhcmdldCA9IGVsZW1lbnQ7XHJcbiAgICAgICAgdGhpcy5zaG9yY3V0ID0gc2hvcmN1dENvbWJpbmF0aW9uO1xyXG4gICAgICAgIHRoaXMuZXZlbnQgPSBvcHRpb24uVHlwZTtcclxuICAgICAgICB0aGlzLm9wdGlvbiA9IG9wdGlvbjtcclxuICAgICAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XHJcblxyXG4gICAgICAgIHRoaXMuZXZlbnRDYWxsYmFjayA9IChldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2V2ZW50Q2FsbGJhY2snLCB0aGlzLnNob3JjdXQpO1xyXG4gICAgICAgICAgICBsZXQgZTogSlF1ZXJ5RXZlbnRPYmplY3QgPSBldmVudCB8fCA8SlF1ZXJ5RXZlbnRPYmplY3Q+d2luZG93LmV2ZW50O1xyXG4gICAgICAgICAgICBsZXQgY29kZTogbnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9uLkRpc2FibGVJbklucHV0KSB7IC8vRG9uJ3QgZW5hYmxlIHNob3J0Y3V0IGtleXMgaW4gSW5wdXQsIFRleHRhcmVhIGZpZWxkc1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZS50YXJnZXQ7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGUuc3JjRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlLnNyY0VsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQubm9kZVR5cGUgPT0gMykge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC50YWdOYW1lID09ICdJTlBVVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdURVhUQVJFQScpIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL0ZpbmQgV2hpY2gga2V5IGlzIHByZXNzZWRcclxuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSkge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IGUua2V5Q29kZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChlLndoaWNoKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gZS53aGljaDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGNoYXJhY3RlciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb2RlID09IDE4OCkgY2hhcmFjdGVyID0gXCIsXCI7IC8vSWYgdGhlIHVzZXIgcHJlc3NlcyAsIHdoZW4gdGhlIHR5cGUgaXMgb25rZXlkb3duXHJcbiAgICAgICAgICAgIGlmIChjb2RlID09IDE5MCkgY2hhcmFjdGVyID0gXCIuXCI7IC8vSWYgdGhlIHVzZXIgcHJlc3NlcyAsIHdoZW4gdGhlIHR5cGUgaXMgb25rZXlkb3duXHJcblxyXG4gICAgICAgICAgICBsZXQga2V5czogc3RyaW5nW10gPSB0aGlzLnNob3JjdXQuc3BsaXQoXCIrXCIpO1xyXG4gICAgICAgICAgICAvL0tleSBQcmVzc2VkIC0gY291bnRzIHRoZSBudW1iZXIgb2YgdmFsaWQga2V5cHJlc3NlcyAtIGlmIGl0IGlzIHNhbWUgYXMgdGhlIG51bWJlciBvZiBrZXlzLCB0aGUgc2hvcnRjdXQgZnVuY3Rpb24gaXMgaW52b2tlZFxyXG4gICAgICAgICAgICBsZXQga3A6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgICAgICBpZiAoZS5jdHJsS2V5KSB0aGlzLm1vZGlmaWVycy5jdHJsLnByZXNzZWQgPSBlLmN0cmxLZXk7XHJcbiAgICAgICAgICAgIGlmIChlLnNoaWZ0S2V5KSB0aGlzLm1vZGlmaWVycy5zaGlmdC5wcmVzc2VkID0gZS5zaGlmdEtleTtcclxuICAgICAgICAgICAgaWYgKGUuYWx0S2V5KSB0aGlzLm1vZGlmaWVycy5hbHQucHJlc3NlZCA9IGUuYWx0S2V5O1xyXG4gICAgICAgICAgICBpZiAoZS5tZXRhS2V5KSB0aGlzLm1vZGlmaWVycy5tZXRhLnByZXNzZWQgPSBlLm1ldGFLZXk7XHJcblxyXG4gICAgICAgICAgICBsZXQgaTogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBrOiBzdHJpbmcgPSBrZXlzW2ldO1xyXG4gICAgICAgICAgICAgICAgLy9Nb2RpZmllcnNcclxuICAgICAgICAgICAgICAgIGlmIChrID09ICdjdHJsJyB8fCBrID09ICdjb250cm9sJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuY3RybC53YW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrID09ICdzaGlmdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLnNoaWZ0LndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsgPT0gJ2FsdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmFsdC53YW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrID09ICdtZXRhJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMubWV0YS53YW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrLmxlbmd0aCA+IDEpIHsgLy9JZiBpdCBpcyBhIHNwZWNpYWwga2V5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3BlY2lhbF9rZXlzW2tdID09IGNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9uLktleWNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb24uS2V5Y29kZSA9PSBjb2RlKSBrcCsrO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy9UaGUgc3BlY2lhbCBrZXlzIGRpZCBub3QgbWF0Y2hcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhcmFjdGVyID09IGspIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNoaWZ0X251bXNbY2hhcmFjdGVyXSAmJiBlLnNoaWZ0S2V5KSB7IC8vU3R1cGlkIFNoaWZ0IGtleSBidWcgY3JlYXRlZCBieSB1c2luZyBsb3dlcmNhc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJhY3RlciA9IHRoaXMuc2hpZnRfbnVtc1tjaGFyYWN0ZXJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJhY3RlciA9PSBrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGtwID09IGtleXMubGVuZ3RoICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5jdHJsLnByZXNzZWQgPT0gdGhpcy5tb2RpZmllcnMuY3RybC53YW50ZWQgJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLnNoaWZ0LnByZXNzZWQgPT0gdGhpcy5tb2RpZmllcnMuc2hpZnQud2FudGVkICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5hbHQucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5hbHQud2FudGVkICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5tZXRhLnByZXNzZWQgPT0gdGhpcy5tb2RpZmllcnMubWV0YS53YW50ZWQpIHtcclxuXHJcbmNvbnNvbGUubG9nKCdjYWxsYmFjaycsIHRoaXMuc2hvcmN1dCwgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMub3B0aW9uLlByb3BhZ2F0ZSkgeyAvL1N0b3AgdGhlIGV2ZW50XHJcbiAgICAgICAgICAgICAgICAgICAgLy9lLmNhbmNlbEJ1YmJsZSBpcyBzdXBwb3J0ZWQgYnkgSUUgLSB0aGlzIHdpbGwga2lsbCB0aGUgYnViYmxpbmcgcHJvY2Vzcy5cclxuICAgICAgICAgICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL2Uuc3RvcFByb3BhZ2F0aW9uIHdvcmtzIGluIEZpcmVmb3guXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5jdHJsLnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuc2hpZnQucHJlc3NlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5hbHQucHJlc3NlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5tZXRhLnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCAge1xyXG4gICAgS2V5Ym9hcmRTaG9ydGN1dCxcclxuICAgIFNob3J0Y3V0T3B0aW9uLFxyXG4gICAgS2V5Ym9hcmRFdmVudFxyXG59IGZyb20gXCIuL0tleWJvYXJkU2hvcnRjdXRcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUtleWJvYXJkU2hvcnRjdXRzIHtcclxuICAgIFtrZXk6IHN0cmluZ106IEtleWJvYXJkU2hvcnRjdXRcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlIHtcclxuICAgIGFkZChzaG9yY3V0TmFtZTogc3RyaW5nLCBjYWxsYmFjazogKCkgPT4gdm9pZCwgb3B0aW9uczogU2hvcnRjdXRPcHRpb24pOiB2b2lkO1xyXG4gICAgcmVtb3ZlKHNob3JjdXROYW1lOiBzdHJpbmcpOiB2b2lkO1xyXG5cclxuICAgIHNob3JjdXRzOiBJS2V5Ym9hcmRTaG9ydGN1dHNcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzUmVnaXN0ZXJQcm92aWRlciBleHRlbmRzIG5nLklTZXJ2aWNlUHJvdmlkZXIge1xyXG4gICAgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNob3J0Y3V0c1JlZ2lzdGVyIGltcGxlbWVudHMgSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZSB7XHJcbiAgICBwcml2YXRlIF9sb2c6IG5nLklMb2dTZXJ2aWNlO1xyXG4gICAgcHJpdmF0ZSBfZGVmYXVsdE9wdGlvbjogU2hvcnRjdXRPcHRpb247XHJcbiAgICBwcml2YXRlIF9zaG9ydGN1dHM6IElLZXlib2FyZFNob3J0Y3V0cztcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3IoXHJcbiAgICAgICAgJGxvZzogbmcuSUxvZ1NlcnZpY2UsXHJcbiAgICAgICAgb3B0aW9uOiBTaG9ydGN1dE9wdGlvblxyXG4gICAgKSB7XHJcbiAgICAgICAgXCJuZ0luamVjdFwiO1xyXG4gICAgICAgIHRoaXMuX2xvZyA9ICRsb2c7XHJcbiAgICAgICAgdGhpcy5fZGVmYXVsdE9wdGlvbiA9IG9wdGlvbiA/IF8uZGVmYXVsdHMob3B0aW9uLCB0aGlzLmdldERlZmF1bHRPcHRpb24oKSkgOiB0aGlzLmdldERlZmF1bHRPcHRpb24oKTtcclxuXHJcbiAgICAgICAgdGhpcy5fc2hvcnRjdXRzID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXREZWZhdWx0T3B0aW9uKCk6IFNob3J0Y3V0T3B0aW9uIHtcclxuICAgICAgICBsZXQgZGVmYXVsdE9wdGlvbjogU2hvcnRjdXRPcHRpb24gPSB7XHJcbiAgICAgICAgICAgIFR5cGU6IEtleWJvYXJkRXZlbnQuS2V5ZG93bixcclxuICAgICAgICAgICAgUHJvcGFnYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgRGlzYWJsZUluSW5wdXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBUYXJnZXQ6IGRvY3VtZW50LFxyXG4gICAgICAgICAgICBLZXljb2RlOiBudWxsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRPcHRpb247XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja0FkZFNob3J0Y3V0KGVsZW1lbnQ6IGFueSwgc2hvcmN1dENvbWJpbmF0aW9uOiBzdHJpbmcsIGNhbGxiYWNrOiAoZTogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWQpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAoIWVsZW1lbnQpIHtcclxuICAgICAgICAgICAgLy8gdG9kbyBnZW5lcmF0ZSBlcnJvclxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXNob3JjdXRDb21iaW5hdGlvbikge1xyXG4gICAgICAgICAgICAvLyB0b2RvIGdlbmVyYXRlIGVycm9yXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgLy8gdG9kbyBnZW5lcmF0ZSBlcnJvclxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IHNob3JjdXRzKCk6IElLZXlib2FyZFNob3J0Y3V0cyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Nob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYWRkKHNob3JjdXROYW1lOiBzdHJpbmcsIGNhbGxiYWNrOiAoZTogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWQsIG9wdGlvbjogU2hvcnRjdXRPcHRpb24pOiB2b2lkIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnYWRkJywgc2hvcmN1dE5hbWUsIGNhbGxiYWNrLCBvcHRpb24pO1xyXG4gICAgICAgIGxldCBzaG9yY3V0T3B0aW9uOiBTaG9ydGN1dE9wdGlvbiA9IG9wdGlvbiA/IF8uZGVmYXVsdHMob3B0aW9uLCB0aGlzLl9kZWZhdWx0T3B0aW9uKSA6IHRoaXMuX2RlZmF1bHRPcHRpb247XHJcbiAgICAgICAgbGV0IHNob3JjdXRDb21iaW5hdGlvbjogc3RyaW5nID0gc2hvcmN1dE5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICBsZXQgZWxlbWVudCA9IHNob3JjdXRPcHRpb24uVGFyZ2V0O1xyXG5cclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBzaG9yY3V0T3B0aW9uLlRhcmdldCA9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2hvcmN1dE9wdGlvbi5UYXJnZXQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBzaG9yY3V0T3B0aW9uLlRhcmdldDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jaGVja0FkZFNob3J0Y3V0KGVsZW1lbnQsIHNob3JjdXRDb21iaW5hdGlvbiwgY2FsbGJhY2spKSB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBuZXdLZXlib2FyZFNob3J0Y3V0ID0gbmV3IEtleWJvYXJkU2hvcnRjdXQoZWxlbWVudCwgc2hvcmN1dENvbWJpbmF0aW9uLCBzaG9yY3V0T3B0aW9uLCBjYWxsYmFjayk7XHJcblxyXG5cdFx0dGhpcy5fc2hvcnRjdXRzW3Nob3JjdXRDb21iaW5hdGlvbl0gPSBuZXdLZXlib2FyZFNob3J0Y3V0O1xyXG5cclxuXHRcdC8vQXR0YWNoIHRoZSBmdW5jdGlvbiB3aXRoIHRoZSBldmVudFxyXG5cdFx0aWYgKGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcikgeyBcclxuICAgICAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHNob3JjdXRPcHRpb24uVHlwZSwgbmV3S2V5Ym9hcmRTaG9ydGN1dC5ldmVudENhbGxiYWNrLCBmYWxzZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChlbGVtZW50LmF0dGFjaEV2ZW50KSB7IFxyXG4gICAgICAgICAgICBlbGVtZW50LmF0dGFjaEV2ZW50KCdvbicgKyBzaG9yY3V0T3B0aW9uLlR5cGUsIG5ld0tleWJvYXJkU2hvcnRjdXQuZXZlbnRDYWxsYmFjayk7XHJcbiAgICAgICAgfSBlbHNlIHsgXHJcbiAgICAgICAgICAgIGVsZW1lbnQub24oc2hvcmN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2spOyBcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHJlbW92ZShzaG9yY3V0TmFtZTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRsZXQgc2hvcnRjdXRDb21iaW5hdGlvbiA9IHNob3JjdXROYW1lLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRsZXQgYmluZGluZzogS2V5Ym9hcmRTaG9ydGN1dCA9IHRoaXMuX3Nob3J0Y3V0c1tzaG9ydGN1dENvbWJpbmF0aW9uXTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3JlbW92ZScsIHNob3JjdXROYW1lLCB0aGlzLl9zaG9ydGN1dHNbc2hvcnRjdXRDb21iaW5hdGlvbl0pO1xyXG5cdFx0ZGVsZXRlKHRoaXMuX3Nob3J0Y3V0c1tzaG9ydGN1dENvbWJpbmF0aW9uXSlcclxuXHRcdGlmICghYmluZGluZykgcmV0dXJuO1xyXG5cclxuXHRcdGxldCB0eXBlID0gYmluZGluZy5ldmVudDtcclxuXHRcdGxldCBlbGVtZW50ID0gYmluZGluZy50YXJnZXQ7XHJcblx0XHRsZXQgY2FsbGJhY2sgPSBiaW5kaW5nLmV2ZW50Q2FsbGJhY2s7XHJcblxyXG5cdFx0aWYgKGVsZW1lbnQuZGV0YWNoRXZlbnQpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5kZXRhY2hFdmVudCgnb24nICsgdHlwZSwgY2FsbGJhY2spO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKSB7IFxyXG4gICAgICAgICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICB9IGVsc2UgeyBcclxuICAgICAgICAgICAgLy8gZWxlbWVudFsnb24nICsgdHlwZV0gPSBmYWxzZTtcclxuICAgICAgICAgICAgZWxlbWVudC5vZmYodHlwZSwgY2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coJ3JlbW92ZTEnLCBzaG9yY3V0TmFtZSwgdGhpcy5fc2hvcnRjdXRzW3Nob3J0Y3V0Q29tYmluYXRpb25dKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcblxyXG5jbGFzcyBTaG9ydGN1dHNSZWdpc3RlclByb3ZpZGVyIGltcGxlbWVudHMgSVNob3J0Y3V0c1JlZ2lzdGVyUHJvdmlkZXIge1xyXG4gICAgcHJpdmF0ZSBfc2VydmljZTogU2hvcnRjdXRzUmVnaXN0ZXI7XHJcbiAgICBwcml2YXRlIF9vcHRpb246IFNob3J0Y3V0T3B0aW9uO1xyXG5cclxuICAgIHB1YmxpYyBnZXQgb3B0aW9uKCk6IFNob3J0Y3V0T3B0aW9uIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fb3B0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgb3B0aW9uKHZhbHVlOiBTaG9ydGN1dE9wdGlvbikge1xyXG4gICAgICAgIHRoaXMuX29wdGlvbiA9IHZhbHVlIHx8IG5ldyBTaG9ydGN1dE9wdGlvbigpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyAkZ2V0KFxyXG4gICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9zZXJ2aWNlID09IG51bGwpXHJcbiAgICAgICAgICAgIHRoaXMuX3NlcnZpY2UgPSBuZXcgU2hvcnRjdXRzUmVnaXN0ZXIoJGxvZywgdGhpcy5fb3B0aW9uKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlcnZpY2U7XHJcbiAgICB9XHJcbn1cclxuXHJcbmFuZ3VsYXJcclxuICAgIC5tb2R1bGUoJ3BpcFNob3J0Y3V0cycpXHJcbiAgICAucHJvdmlkZXIoJ3BpcFNob3J0Y3V0c1JlZ2lzdGVyJywgU2hvcnRjdXRzUmVnaXN0ZXJQcm92aWRlcik7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCAge1xyXG4gICAgU2hvcnRjdXRPcHRpb24sXHJcbn0gZnJvbSBcIi4vS2V5Ym9hcmRTaG9ydGN1dFwiO1xyXG5cclxuaW1wb3J0ICB7XHJcbiAgICBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlLFxyXG59IGZyb20gXCIuL1Nob3JjdXRzUmVnaXN0ZXJTZXJ2aWNlXCI7XHJcblxyXG5cclxuICAgIC8vIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBTZWxlY3RlZCcsIGZ1bmN0aW9uICgkcGFyc2UsICRtZENvbnN0YW50LCAkdGltZW91dCkge1xyXG4gICAgLy8gICAgIHJldHVybiB7XHJcbiAgICAvLyAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAvLyAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuXHJcbmNsYXNzIFNob3J0Y3V0Q29udHJvbGxlciB7XHJcbiAgICBwcml2YXRlIF9sb2c6IG5nLklMb2dTZXJ2aWNlO1xyXG5cclxuICAgIHByaXZhdGUgYWN0aW9uU2hvcnRjdXRzOiBGdW5jdGlvbjtcclxuICAgIHByaXZhdGUgbmFtZVNob3J0Y3V0czogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBvcHRpb25zOiBTaG9ydGN1dE9wdGlvbjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAkZWxlbWVudDogYW55LFxyXG4gICAgICAgICRhdHRyczogYW55LFxyXG4gICAgICAgICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgICRwYXJzZTogYW55LFxyXG4gICAgICAgICR0aW1lb3V0LFxyXG4gICAgICAgIHBpcFNob3J0Y3V0c1JlZ2lzdGVyOiBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcbiAgICAgICAgdGhpcy5fbG9nID0gJGxvZztcclxuLy8kcGFyc2UoJGF0dHJzcy5waXBTZWxlY3QpXHJcblxyXG4gICAgICAgIGlmICgkYXR0cnMucGlwU2hvcnRjdXRBY3Rpb24pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJyRhdHRycy5waXBTaG9ydGN1dEFjdGlvbicpO1xyXG4gICAgICAgICAgICB0aGlzLmFjdGlvblNob3J0Y3V0cyA9ICRwYXJzZSgkYXR0cnMucGlwU2hvcnRjdXRBY3Rpb24pO1xyXG4gICAgICAgICAgICBsZXQgYTEgPSAkYXR0cnMucGlwU2hvcnRjdXRBY3Rpb247XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzKCRzY29wZSwgeyRldmVudDoge319KTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJyRhdHRycy5waXBTaG9ydGN1dEFjdGlvbicsIGExKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1Nob3JjdW50IGFjdGlvbiBkb2VzIG5vdCBzZXQuJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICgkYXR0cnMucGlwU2hvcnRjdXROYW1lICYmIF8uaXNTdHJpbmcoJGF0dHJzLnBpcFNob3J0Y3V0TmFtZSkpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lU2hvcnRjdXRzID0gJGF0dHJzLnBpcFNob3J0Y3V0TmFtZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1Nob3JjdW50IG5hbWUgZG9lcyBub3Qgc2V0LicpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm9wdGlvbnMgPSAkYXR0cnMucGlwU2hvcmN1dE9wdGlvbnMgPyA8U2hvcnRjdXRPcHRpb24+JGF0dHJzLnBpcFNob3JjdXRPcHRpb25zIDogPFNob3J0Y3V0T3B0aW9uPnt9O1xyXG4gICAgICAgIHRoaXMub3B0aW9ucy5UYXJnZXQgPSAkZWxlbWVudDtcclxuICAgICAgICAvLyByZWdlc3RlciBrZXlib2FyZCBzaG9ydGN1dFxyXG4gICAgICAgIHBpcFNob3J0Y3V0c1JlZ2lzdGVyLmFkZCh0aGlzLm5hbWVTaG9ydGN1dHMsIChlPzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzKCRzY29wZSwgeyRldmVudDogeydlJzogZX19KTsgICAgICAgICAgXHJcbiAgICAgICAgfSwgdGhpcy5vcHRpb25zKTtcclxuXHJcbiAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBwaXBTaG9ydGN1dHNSZWdpc3Rlci5yZW1vdmUodGhpcy5uYW1lU2hvcnRjdXRzKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3Nob3J0Y3V0IHJlbW92ZWQnKTtcclxuICAgICAgICB9LCAxMDAwMDApXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBrZXlwcmVzc1Nob3J0Y3V0KGFjdGlvbikge1xyXG4gICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIFByZXZlbnQganVuayBmcm9tIGdvaW5nIGludG8gdHlwZXNjcmlwdCBkZWZpbml0aW9uc1xyXG4oKCkgPT4ge1xyXG5cclxuICAgIGZ1bmN0aW9uIHNob3J0Y3V0c0RpcmVjdGl2ZSgkcGFyc2UpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IFNob3J0Y3V0Q29udHJvbGxlclxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcFNob3J0Y3V0Jywgc2hvcnRjdXRzRGlyZWN0aXZlKTtcclxufSkoKTsiLCIndXNlIHN0cmljdCc7XHJcblxyXG5cclxuaW1wb3J0IHtcclxuICAgIFNob3J0Y3V0c1JlZ2lzdGVyXHJcbn0gZnJvbSBcIi4vU2hvcmN1dHNSZWdpc3RlclNlcnZpY2VcIlxyXG5pbXBvcnQgIHtcclxuICAgIEtleWJvYXJkU2hvcnRjdXQsXHJcbiAgICBTaG9ydGN1dE9wdGlvbixcclxuICAgIEtleWJvYXJkRXZlbnRcclxufSBmcm9tIFwiLi9LZXlib2FyZFNob3J0Y3V0XCI7XHJcblxyXG5leHBvcnQgbGV0IFNob3J0Y3V0c0NoYW5nZWRFdmVudCA9ICdwaXBTaG9ydGN1dHNDaGFuZ2VkJztcclxuXHJcbmV4cG9ydCBjbGFzcyBTaW1wbGVTaG9ydGN1dEl0ZW0ge1xyXG4gICAgLy8gU2hvcnRjdXQgY29tYmluYXRpb25cclxuICAgIHB1YmxpYyBzaG9ydGN1dDogc3RyaW5nO1xyXG4gICAgLy8gdGFyZ2V0IG9iamVjdCBcclxuICAgIHB1YmxpYyB0YXJnZXQ/OiBhbnk7XHJcbiAgICAvLyB0YXJnZXQgZWxlbWVudCBieSBJZFxyXG4gICAgcHVibGljIHRhcmdldElkPzogc3RyaW5nO1xyXG4gICAgLy8gLy8gdGFyZ2V0IGVsZW1lbnQgYnkgY2xhc3MgKGZpcnN0ZWxlbWVudD8/KVxyXG4gICAgLy8gcHVibGljIHRhcmdldENsYXNzPzogc3RyaW5nO1xyXG4gICAgLy8gQWNjZXNzIGZ1bmN0aW9uXHJcbiAgICBwdWJsaWMgYWNjZXNzPzogKGV2ZW50OiBKUXVlcnlFdmVudE9iamVjdCkgPT4gYm9vbGVhbjtcclxuICAgIC8vIHdpbmRvdy5sb2NhdGlvbi5ocmVmXHJcbiAgICBwdWJsaWMgaHJlZj86IHN0cmluZztcclxuICAgIC8vICRsb2NhdGlvbi51cmxcclxuICAgIHB1YmxpYyB1cmw/OiBzdHJpbmc7XHJcbiAgICAvLyAkc3RhdGUuZ28oc3RhdGUsIHN0YXRlUGFyYW1zKVxyXG4gICAgcHVibGljIHN0YXRlPzogc3RyaW5nO1xyXG4gICAgLy8gUGFyYW1ldGVycyBmb3IgJHN0YXRlLmdvKHN0YXRlLCBzdGF0ZVBhcmFtcylcclxuICAgIHB1YmxpYyBzdGF0ZVBhcmFtcz86IGFueTtcclxuICAgIC8vICRyb290U2NvcGUuYnJvYWRjYXN0KGV2ZW50KVxyXG4gICAgcHVibGljIGV2ZW50Pzogc3RyaW5nO1xyXG4gICAgLy8gQ2xpY2sgY2FsbGJhY2tcclxuICAgIHB1YmxpYyBrZXlwcmVzcz86IChldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWQ7XHJcbiAgICAvLyBkZWZhdWx0IG9wdGlvbnNcclxuICAgIHB1YmxpYyBvcHRpb25zPzogU2hvcnRjdXRPcHRpb247ICAgIFxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2hvcnRjdXRJdGVtIGV4dGVuZHMgU2ltcGxlU2hvcnRjdXRJdGVtIHtcclxuICAgIHB1YmxpYyBzaG9ydGN1dHM6IFNpbXBsZVNob3J0Y3V0SXRlbVtdO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2hvcnRjdXRzQ29uZmlnIHtcclxuICAgIC8vIEdsb2JhbCBzaG9ydGN1dCBcclxuICAgIHB1YmxpYyBnbG9iYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdID0gW107XHJcbiAgICAvLyBMb2NhbCBzaG9ydGN1dCBcclxuICAgIHB1YmxpYyBsb2NhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW10gPSBbXTtcclxuICAgIC8vIGRlZmF1bHQgb3B0aW9uc1xyXG4gICAgcHVibGljIGRlZmF1bHRPcHRpb25zOiBTaG9ydGN1dE9wdGlvbiA9IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVNob3J0Y3V0c1NlcnZpY2Uge1xyXG4gICAgcmVhZG9ubHkgY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcblxyXG4gICAgZ2xvYmFsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXTtcclxuICAgIGxvY2FsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXTtcclxuXHJcbiAgICBvbihnbG9iYWxTaG9ydGN1dHM/OiBTaG9ydGN1dEl0ZW1bXSwgbG9jYWxTaG9ydGN1dHM/OiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQ7XHJcbiAgICBvZmYoKTogdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzUHJvdmlkZXIgZXh0ZW5kcyBuZy5JU2VydmljZVByb3ZpZGVyIHtcclxuICAgIGNvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG4gICAgXHJcbiAgICBnbG9iYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG4gICAgbG9jYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG4gICAgZGVmYXVsdE9wdGlvbnM6IFNob3J0Y3V0T3B0aW9uO1xyXG59XHJcblxyXG5jbGFzcyBTaG9ydGN1dHNTZXJ2aWNlIGltcGxlbWVudHMgSVNob3J0Y3V0c1NlcnZpY2Uge1xyXG4gICAgcHJpdmF0ZSBfY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcbiAgICBwcml2YXRlIF9vbGRDb25maWc6IFNob3J0Y3V0c0NvbmZpZztcclxuICAgIHByaXZhdGUgX3Jvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2U7XHJcbiAgICBwcml2YXRlIF93aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlO1xyXG4gICAgcHJpdmF0ZSBfbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2U7XHJcbiAgICBwcml2YXRlIF9pbmplY3RvcjogbmcuYXV0by5JSW5qZWN0b3JTZXJ2aWNlOyAgICBcclxuICAgIHByaXZhdGUgX3BpcFNob3J0Y3V0c1JlZ2lzdGVyOiBTaG9ydGN1dHNSZWdpc3RlcjtcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3IoXHJcbiAgICAgICAgY29uZmlnOiBTaG9ydGN1dHNDb25maWcsXHJcbiAgICAgICAgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UsXHJcbiAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIFxyXG4gICAgICAgICRsb2NhdGlvbjogbmcuSUxvY2F0aW9uU2VydmljZSwgXHJcbiAgICAgICAgJGluamVjdG9yOiBuZy5hdXRvLklJbmplY3RvclNlcnZpY2UsXHJcbiAgICAgICAgcGlwU2hvcnRjdXRzUmVnaXN0ZXI6IFNob3J0Y3V0c1JlZ2lzdGVyXHJcbiAgICApIHtcclxuICAgICAgICB0aGlzLl9jb25maWcgPSBjb25maWc7XHJcbiAgICAgICAgdGhpcy5fb2xkQ29uZmlnID0gXy5jbG9uZURlZXAodGhpcy5fY29uZmlnKTtcclxuICAgICAgICB0aGlzLl9yb290U2NvcGUgPSAkcm9vdFNjb3BlO1xyXG4gICAgdGhpcy5fd2luZG93ID0gJHdpbmRvdztcclxuICAgIHRoaXMuX2xvY2F0aW9uID0gJGxvY2F0aW9uO1xyXG4gICAgdGhpcy5faW5qZWN0b3IgPSAkaW5qZWN0b3I7ICAgIFxyXG4gICAgdGhpcy5fcGlwU2hvcnRjdXRzUmVnaXN0ZXIgPSBwaXBTaG9ydGN1dHNSZWdpc3RlcjtcclxuXHJcbmNvbnNvbGUubG9nKCdTaG9ydGN1dHNTZXJ2aWNlIHRoaXMuX29sZENvbmZpZycsIHRoaXMuX29sZENvbmZpZyk7XHJcbiAgICAgICAgLy8gYWRkIHNob3J0Y3V0c1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyk7ICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICAvLyBwcml2YXRlIGRlY2xhcmF0aW9uIFxyXG4gICAgcHJpdmF0ZSBzZW5kQ2hhbmdlRXZlbnQoKSB7XHJcbiAgICAgICAgLy8gcmVtb3ZlIHNob3J0Y3V0c1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2hvcnRjdXRzKHRoaXMuX29sZENvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2hvcnRjdXRzKHRoaXMuX29sZENvbmZpZy5sb2NhbFNob3J0Y3V0cyk7XHJcbiAgICAgICAgLy8gYWRkIHNob3J0Y3V0c1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyk7XHJcblxyXG4gICAgICAgIHRoaXMuX3Jvb3RTY29wZS4kZW1pdChTaG9ydGN1dHNDaGFuZ2VkRXZlbnQsIHRoaXMuX2NvbmZpZyk7XHJcbiAgICAgICAgLy8gc2F2ZSBjdXJyZW50IGNvbmZpZyB0byBvbGRDb25maWdcclxuICAgICAgICB0aGlzLl9vbGRDb25maWcgPSBfLmNsb25lRGVlcCh0aGlzLl9jb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVtb3ZlU2hvcnRjdXRzKGNvbGxlY3Rpb246IFNob3J0Y3V0SXRlbVtdKTogdm9pZCB7XHJcbiAgICAgICAgXy5lYWNoKGNvbGxlY3Rpb24sIChrKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuX3BpcFNob3J0Y3V0c1JlZ2lzdGVyLnJlbW92ZShrLnNob3J0Y3V0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGtleXByZXNzU2hvcnRjdXQoc2hvcmN1dDogU2ltcGxlU2hvcnRjdXRJdGVtLCBldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpIHtcclxuICAgICAgICBpZiAoc2hvcmN1dC5hY2Nlc3MgJiYgXy5pc0Z1bmN0aW9uKHNob3JjdXQuYWNjZXNzKSkge1xyXG4gICAgICAgICAgICBpZiAoIXNob3JjdXQuYWNjZXNzKGV2ZW50KSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBcclxuXHJcbiAgICAgICAgaWYgKHNob3JjdXQua2V5cHJlc3MpIHtcclxuICAgICAgICAgICAgc2hvcmN1dC5rZXlwcmVzcyhldmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzaG9yY3V0LmhyZWYpIHtcclxuICAgICAgICAgICAgdGhpcy5fd2luZG93LmxvY2F0aW9uLmhyZWYgPSBzaG9yY3V0LmhyZWY7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzaG9yY3V0LnVybCkge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2NhdGlvbi51cmwoc2hvcmN1dC51cmwpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2hvcmN1dC5zdGF0ZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5faW5qZWN0b3IuaGFzKCckc3RhdGUnKSkge1xyXG4gICAgICAgICAgICAgICAgdmFyICRzdGF0ZSA9IHRoaXMuX2luamVjdG9yLmdldCgnJHN0YXRlJyk7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGVbJ2dvJ10oc2hvcmN1dC5zdGF0ZSwgc2hvcmN1dC5zdGF0ZVBhcmFtcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNob3JjdXQuZXZlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5fcm9vdFNjb3BlLiRicm9hZGNhc3Qoc2hvcmN1dC5ldmVudCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIHJhaXNlIG5vdGlmaWNhdGlvblxyXG4gICAgICAgICAgICB0aGlzLl9yb290U2NvcGUuJGJyb2FkY2FzdCgncGlwU2hvcnRjdXRLZXlwcmVzcycsIHNob3JjdXQuc2hvcnRjdXQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFkZFNob3J0Y3V0cyhjb2xsZWN0aW9uOiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQge1xyXG4gICAgICAgIGxldCBnZW5lcmFsT3B0aW9uczogU2hvcnRjdXRPcHRpb24gPSB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnMgPyB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnMgOiA8U2hvcnRjdXRPcHRpb24+e307XHJcbiAgICAgICAgXHJcbiAgICAgICAgXy5lYWNoKGNvbGxlY3Rpb24sIChrKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBvcHRpb246IFNob3J0Y3V0T3B0aW9uID0gay5vcHRpb25zID8gay5vcHRpb25zIDogZ2VuZXJhbE9wdGlvbnM7XHJcbiAgICAgICAgICAgIGxldCB0YXJnZXQ6IGFueTtcclxuXHJcbiAgICAgICAgICAgIHRhcmdldCA9IGsudGFyZ2V0ID8gay50YXJnZXQgOiBrLnRhcmdldElkO1xyXG4gICAgICAgICAgICBvcHRpb24uVGFyZ2V0ID0gdGFyZ2V0O1xyXG4gICAgICAgICAgICAvLyByZWdlc3RlciBrZXlib2FyZCBzaG9ydGN1dFxyXG4gICAgICAgICAgICB0aGlzLl9waXBTaG9ydGN1dHNSZWdpc3Rlci5hZGQoay5zaG9ydGN1dCwgKGU/OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMua2V5cHJlc3NTaG9ydGN1dChrLCBlKTsgICAgICAgIFxyXG4gICAgICAgICAgICB9LCBvcHRpb24pOyAgICAgICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcHVibGljIGRlY2xhcmF0aW9uIFxyXG5cclxuICAgIHB1YmxpYyBnZXQgY29uZmlnKCk6IFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGRlZmF1bHRPcHRpb25zKCk6IFNob3J0Y3V0T3B0aW9uIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmRlZmF1bHRPcHRpb25zO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgZGVmYXVsdE9wdGlvbnModmFsdWU6IFNob3J0Y3V0T3B0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmRlZmF1bHRPcHRpb25zID0gdmFsdWUgfHwgbnVsbDtcclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZ2xvYmFsU2hvcnRjdXRzKCk6IFNob3J0Y3V0SXRlbVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGdsb2JhbFNob3J0Y3V0cyh2YWx1ZTogU2hvcnRjdXRJdGVtW10pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gdmFsdWUgfHwgW107XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGxvY2FsU2hvcnRjdXRzKCk6IFNob3J0Y3V0SXRlbVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgbG9jYWxTaG9ydGN1dHModmFsdWU6IFNob3J0Y3V0SXRlbVtdKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzID0gdmFsdWUgfHwgW107XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgb24oZ2xvYmFsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10sIGxvY2FsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10pOiB2b2lkIHtcclxuICAgICAgICBpZiAoZ2xvYmFsU2hvcnRjdXRzICYmIF8uaXNBcnJheShnbG9iYWxTaG9ydGN1dHMpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMgPSBnbG9iYWxTaG9ydGN1dHM7ICAgIFxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobG9jYWxTaG9ydGN1dHMgJiYgXy5pc0FycmF5KGxvY2FsU2hvcnRjdXRzKSkge1xyXG4gICAgICAgICAgICB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHMgPSBsb2NhbFNob3J0Y3V0czsgICAgXHJcbiAgICAgICAgfSAgICAgICAgXHJcblxyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9mZigpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gW107XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzID0gW107XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU2hvcnRjdXRzUHJvdmlkZXIgaW1wbGVtZW50cyBJU2hvcnRjdXRzUHJvdmlkZXIge1xyXG4gICAgcHJpdmF0ZSBfY29uZmlnOiBTaG9ydGN1dHNDb25maWcgPSBuZXcgU2hvcnRjdXRzQ29uZmlnKCk7XHJcbiAgICBwcml2YXRlIF9zZXJ2aWNlOiBTaG9ydGN1dHNTZXJ2aWNlO1xyXG5cclxuICAgIHB1YmxpYyBnZXQgY29uZmlnKCk6IFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGNvbmZpZyh2YWx1ZTogU2hvcnRjdXRzQ29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnID0gdmFsdWUgfHwgbmV3IFNob3J0Y3V0c0NvbmZpZygpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZGVmYXVsdE9wdGlvbnMoKTogU2hvcnRjdXRPcHRpb24ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBkZWZhdWx0T3B0aW9ucyh2YWx1ZTogU2hvcnRjdXRPcHRpb24pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnMgPSB2YWx1ZSB8fCBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZ2xvYmFsU2hvcnRjdXRzKCk6IFNob3J0Y3V0SXRlbVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGdsb2JhbFNob3J0Y3V0cyh2YWx1ZTogU2hvcnRjdXRJdGVtW10pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gdmFsdWUgfHwgW107XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBsb2NhbFNob3J0Y3V0cygpOiBTaG9ydGN1dEl0ZW1bXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGxvY2FsU2hvcnRjdXRzKHZhbHVlOiBTaG9ydGN1dEl0ZW1bXSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyA9IHZhbHVlIHx8IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyAkZ2V0KFxyXG4gICAgICAgICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLCBcclxuICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSwgXHJcbiAgICAgICAgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLCBcclxuICAgICAgICAkaW5qZWN0b3I6IG5nLmF1dG8uSUluamVjdG9yU2VydmljZSxcclxuICAgICAgICBwaXBTaG9ydGN1dHNSZWdpc3RlcjogU2hvcnRjdXRzUmVnaXN0ZXJcclxuICAgICkge1xyXG4gICAgICAgIFwibmdJbmplY3RcIjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX3NlcnZpY2UgPT0gbnVsbClcclxuICAgICAgICAgICAgdGhpcy5fc2VydmljZSA9IG5ldyBTaG9ydGN1dHNTZXJ2aWNlKHRoaXMuX2NvbmZpZywgJHJvb3RTY29wZSwgJHdpbmRvdywgJGxvY2F0aW9uLCAkaW5qZWN0b3IsIHBpcFNob3J0Y3V0c1JlZ2lzdGVyKTtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gdGhpcy5fc2VydmljZTtcclxuICAgIH1cclxufVxyXG5cclxuYW5ndWxhclxyXG4gICAgLm1vZHVsZSgncGlwU2hvcnRjdXRzJylcclxuICAgIC5wcm92aWRlcigncGlwU2hvcnRjdXRzJywgU2hvcnRjdXRzUHJvdmlkZXIpO1xyXG5cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ3BpcFNob3J0Y3V0cycsIFsnbmdNYXRlcmlhbCcsICd1aS5yb3V0ZXInXSk7XHJcblxyXG5pbXBvcnQgJy4vU2hvcmN1dHNSZWdpc3RlclNlcnZpY2UnO1xyXG5pbXBvcnQgJy4vU2hvcnRjdXRzU2VydmljZSc7XHJcbmltcG9ydCAnLi9TaG9ydGN1dERpcmVjdGl2ZSc7XHJcblxyXG5leHBvcnQgKiBmcm9tICcuL1Nob3J0Y3V0c1NlcnZpY2UnO1xyXG5leHBvcnQgKiBmcm9tICcuL1Nob3JjdXRzUmVnaXN0ZXJTZXJ2aWNlJzsiLCIvKipcclxuICogQGZpbGUgS2V5Ym9hcmQgbmF2aWdhdGlvbiB3aXRoIHNjcm9sbGluZyBvdmVyIG5vbi1mb2N1c2FibGUgY29udHJvbHNcclxuICogQGNvcHlyaWdodCBEaWdpdGFsIExpdmluZyBTb2Z0d2FyZSBDb3JwLiAyMDE0LTIwMTZcclxuICovXHJcblxyXG4vKiBnbG9iYWwgYW5ndWxhciAqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwU2VsZWN0ZWRcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBTZWxlY3RlZCcsIGZ1bmN0aW9uICgkcGFyc2UsICRtZENvbnN0YW50LCAkdGltZW91dCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZTogYW55LCAkZWxlbWVudCwgJGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgIGluZGV4R2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdGVkID8gJHBhcnNlKCRhdHRycy5waXBTZWxlY3RlZCkgOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGluZGV4U2V0dGVyID0gaW5kZXhHZXR0ZXIgPyBpbmRleEdldHRlci5hc3NpZ24gOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdGVkSWQgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdGVkSWQpIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpZFNldHRlciA9IGlkR2V0dGVyID8gaWRHZXR0ZXIuYXNzaWduIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VHZXR0ZXIgPSAkYXR0cnMucGlwU2VsZWN0ID8gJHBhcnNlKCRhdHRycy5waXBTZWxlY3QpIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBlbnRlclNwYWNlR2V0dGVyID0gJGF0dHJzLnBpcEVudGVyU3BhY2VQcmVzcyA/ICRwYXJzZSgkYXR0cnMucGlwRW50ZXJTcGFjZVByZXNzKSA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgbm9TY3JvbGwgPSB0b0Jvb2xlYW4oJGF0dHJzLnBpcE5vU2Nyb2xsKSxcclxuICAgICAgICAgICAgICAgICAgICBtb2RpZmllciA9IHRvQm9vbGVhbigkYXR0cnMucGlwU2tpcEhpZGRlbikgPyAnOnZpc2libGUnIDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lID0gdG9Cb29sZWFuKCRhdHRycy5waXBUcmVlTGlzdCkgPyAnLnBpcC1zZWxlY3RhYmxlLXRyZWUnIDogJy5waXAtc2VsZWN0YWJsZScsXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRleCA9IGluZGV4R2V0dGVyKCRzY29wZSksXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEVsZW1lbnRUYWJpbmV4ID0gJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnKSxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTZWxlY3RlZFdhdGNoID0gJGF0dHJzLnBpcFNlbGVjdGVkV2F0Y2gsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNTY3JvbGxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHZhcmlhYmxlcyBmb3IgdG91Y2ggICAgXHJcbiAgICAgICAgICAgICAgICB2YXIgdG91Y2hTdGFydFgsIHRvdWNoU3RhcnRZLCB0cmFja2luZ0NsaWNrLCB0cmFja2luZ0NsaWNrU3RhcnQsIHRhcmdldEVsZW1lbnQsIGxhc3RDbGlja1RpbWUsIGNhbmNlbE5leHRDbGljaztcclxuICAgICAgICAgICAgICAgIC8vIGNvbnN0YW50IGZvciB0b3VjaFxyXG4gICAgICAgICAgICAgICAgdmFyIHRvdWNoQm91bmRhcnkgPSAxMCxcclxuICAgICAgICAgICAgICAgICAgICB0YXBkZWxheSA9IDIwMCxcclxuICAgICAgICAgICAgICAgICAgICB0YXBUaW1lb3V0ID0gNzAwO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFNldCB0YWJpbmRleCBpZiBpdCdzIG5vdCBzZXQgeWV0XHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIGN1cnJlbnRFbGVtZW50VGFiaW5leCB8fCAwKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2NsaWNrJywgY2xhc3NOYW1lLCBvbkNsaWNrRXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNoc3RhcnQnLCBjbGFzc05hbWUsIG9uVG91Y2hTdGFydCk7XHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5vbigndG91Y2htb3ZlJywgY2xhc3NOYW1lLCBvblRvdWNoTW92ZSk7XHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5vbigndG91Y2hlbmQnLCBjbGFzc05hbWUsIG9uVG91Y2hFbmQpO1xyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNoY2FuY2VsJywgY2xhc3NOYW1lLCBvblRvdWNoQ2FuY2VsKTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdrZXlkb3duJywgb25LZXlEb3duKTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c2luJywgb25Gb2N1c0luKTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c291dCcsIG9uRm9jdXNPdXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFdhdGNoIHNlbGVjdGVkIGl0ZW0gaW5kZXhcclxuICAgICAgICAgICAgICAgIGlmICghdG9Cb29sZWFuKCRhdHRycy5waXBUcmVlTGlzdCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGluZGV4R2V0dGVyLCBmdW5jdGlvbiAobmV3U2VsZWN0ZWRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHsgaXRlbUluZGV4OiBuZXdTZWxlY3RlZEluZGV4IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGlkR2V0dGVyLCBmdW5jdGlvbiAobmV3U2VsZWN0ZWRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oeyBpdGVtSWQ6IG5ld1NlbGVjdGVkSWQsIHJhaXNlRXZlbnQ6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFdhdGNoIHJlc3luYyBzZWxlY3Rpb25cclxuICAgICAgICAgICAgICAgIGlmIChwaXBTZWxlY3RlZFdhdGNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChwaXBTZWxlY3RlZFdhdGNoLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERlbGF5IHVwZGF0ZSB0byBhbGxvdyBuZy1yZXBlYXQgdG8gdXBkYXRlIERPTVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleEdldHRlcigkc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7IGl0ZW1JbmRleDogc2VsZWN0ZWRJbmRleCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBTZWxlY3QgaXRlbSBkZWZpbmVkIGJ5IGluZGV4XHJcbiAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHsgaXRlbUluZGV4OiBzZWxlY3RlZEluZGV4LCBpdGVtczogJGVsZW1lbnQuZmluZChjbGFzc05hbWUpIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIENvbnZlcnRzIHZhbHVlIGludG8gYm9vbGVhblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdG9Cb29sZWFuKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09ICcxJyB8fCB2YWx1ZSA9PSAndHJ1ZSc7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIEZ1bmN0aW9ucyBhbmQgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzZWxlY3RJdGVtKGl0ZW1QYXJhbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNTY3JvbGxlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBpdGVtSW5kZXggPSBpdGVtUGFyYW1zLml0ZW1JbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUlkID0gaXRlbVBhcmFtcy5pdGVtSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zID0gaXRlbVBhcmFtcy5pdGVtcyB8fCAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArIG1vZGlmaWVyKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNMZW5ndGggPSBpdGVtcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1QYXJhbXMuaXRlbSkgcmV0dXJuIGl0ZW1QYXJhbXMuaXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtSW5kZXggPT09IHVuZGVmaW5lZCAmJiBpdGVtSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4ID0gaXRlbXMuaW5kZXgoaXRlbXMuZmlsdGVyKCdbcGlwLWlkPScgKyBpdGVtSWQgKyAnXScpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtSW5kZXggPj0gMCAmJiBpdGVtSW5kZXggPCBpdGVtc0xlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtc1tpdGVtSW5kZXhdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gKCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50ID0gaXRlbVBhcmFtcy5yYWlzZUV2ZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSkucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkIG1kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IGFuZ3VsYXIuZWxlbWVudChpdGVtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzZWxlY3RlZCBtZC1mb2N1c2VkJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5mb2N1cygpOyAvLyB0b2RvINGB0LTQstC40LPQsNC10YIg0YHQv9C40YHQvtC6INGC0YPRgiwg0L3QsCDQv9C10YDQstC+0Lwg0L/RgNC+0YXQvtC00LVcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFub1Njcm9sbCkgc2Nyb2xsVG9JdGVtKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmFpc2VFdmVudCkgZGVmaW5lU2VsZWN0ZWRJbmRleChpdGVtcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBkZWZpbmVTZWxlY3RlZEluZGV4KGl0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZFNlbGVjdGVkSW5kZXggPSBzZWxlY3RlZEluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgaXRlbXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkKGl0ZW1zW2luZGV4XSkuaGFzQ2xhc3MoJ3NlbGVjdGVkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhlY3V0ZSBjYWxsYmFjayB0byBub3RpZnkgYWJvdXQgaXRlbSBzZWxlY3RcclxuICAgICAgICAgICAgICAgICAgICBpZiAob2xkU2VsZWN0ZWRJbmRleCAhPSBzZWxlY3RlZEluZGV4ICYmIHNlbGVjdGVkSW5kZXggIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkodXBkYXRlSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkob25TZWxlY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlSW5kZXgoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZEl0ZW0gPSBhbmd1bGFyLmVsZW1lbnQoaXRlbXNbc2VsZWN0ZWRJbmRleF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJZCA9IHNlbGVjdGVkSXRlbS5hdHRyKCdwaXAtaWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleFNldHRlcikgaW5kZXhTZXR0ZXIoJHNjb3BlLCBzZWxlY3RlZEluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkU2V0dGVyKSBpZFNldHRlcigkc2NvcGUsIHNlbGVjdGVkSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvblNlbGVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uU2VsZWN0KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW1zW3NlbGVjdGVkSW5kZXhdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBzZWxlY3RlZEl0ZW0uYXR0cigncGlwLWlkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhbmdlR2V0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VHZXR0ZXIoJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IHNlbGVjdGVkSXRlbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6IHNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBzZWxlY3RlZElkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJbmRleDogc2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkSW5kZXg6IG9sZFNlbGVjdGVkSW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9JdGVtKCRpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vU2Nyb2xsKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3AgPSAkZWxlbWVudC5vZmZzZXQoKS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9ICRlbGVtZW50LmhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBjb250YWluZXJUb3AgKyBjb250YWluZXJIZWlnaHQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1Ub3AgPSAkaXRlbS5vZmZzZXQoKS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1IZWlnaHQgPSAkaXRlbS5vdXRlckhlaWdodCh0cnVlKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUJvdHRvbSA9IGl0ZW1Ub3AgKyBpdGVtSGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJTY3JvbGxUb3AgPSAkZWxlbWVudC5zY3JvbGxUb3AoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaXNTY3JvbGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzU2Nyb2xsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGFpbmVyVG9wID4gaXRlbVRvcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgaXRlbVRvcCAtIGNvbnRhaW5lclRvcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGNvbnRhaW5lckJvdHRvbSA8IGl0ZW1Cb3R0b20pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIGl0ZW1Cb3R0b20gLSBjb250YWluZXJCb3R0b20pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXZlbnRUYXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBPbiBzb21lIG9sZGVyIGJyb3dzZXJzIHRoZSBldmVudCB0YXJnZXQgbWF5IGJlIGEgdGV4dCBub2RlLlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudFRhcmdldC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50VGFyZ2V0LnBhcmVudE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnRUYXJnZXQ7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvdWNoSGFzTW92ZWQoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdG91Y2ggPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXSwgYm91bmRhcnkgPSB0b3VjaEJvdW5kYXJ5OyAvL1RvdWNobW92ZSBib3VuZGFyeSwgYmV5b25kIHdoaWNoIGEgY2xpY2sgd2lsbCBiZSBjYW5jZWxsZWQuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyh0b3VjaC5wYWdlWCAtIHRvdWNoU3RhcnRYKSA+IGJvdW5kYXJ5IHx8IE1hdGguYWJzKHRvdWNoLnBhZ2VZIC0gdG91Y2hTdGFydFkpID4gYm91bmRhcnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uQ2xpY2tFdmVudChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oeyBpdGVtOiBldmVudC5jdXJyZW50VGFyZ2V0LCByYWlzZUV2ZW50OiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uVG91Y2hTdGFydChldikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vZXYucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gZXYub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnRbJ3RhcmdldFRvdWNoZXMnXS5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBsZXQgdGFyZ2V0RWxlbWVudCA9IGdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXZlbnQudGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdG91Y2ggPSBldmVudFsndGFyZ2V0VG91Y2hlcyddWzBdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0cmFja2luZ0NsaWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0cmFja2luZ0NsaWNrU3RhcnQgPSBldmVudC50aW1lU3RhbXA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRvdWNoU3RhcnRYID0gdG91Y2gucGFnZVg7XHJcbiAgICAgICAgICAgICAgICAgICAgdG91Y2hTdGFydFkgPSB0b3VjaC5wYWdlWTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKChldmVudC50aW1lU3RhbXAgLSBsYXN0Q2xpY2tUaW1lKSA8IHRhcGRlbGF5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uVG91Y2hNb3ZlKGV2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0cmFja2luZ0NsaWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBldi5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSB0b3VjaCBoYXMgbW92ZWQsIGNhbmNlbCB0aGUgY2xpY2sgdHJhY2tpbmdcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0RWxlbWVudCAhPT0gZ2V0VGFyZ2V0RWxlbWVudEZyb21FdmVudFRhcmdldChldmVudC50YXJnZXQpIHx8IHRvdWNoSGFzTW92ZWQoZXZlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvblRvdWNoRW5kKGV2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZvckVsZW1lbnQsIG5ld1RyYWNraW5nQ2xpY2tTdGFydCwgdGFyZ2V0VGFnTmFtZSwgc2Nyb2xsUGFyZW50LCB0b3VjaCwgbmV3dGFyZ2V0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdHJhY2tpbmdDbGljaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQgPSBldi5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFByZXZlbnQgcGhhbnRvbSBjbGlja3Mgb24gZmFzdCBkb3VibGUtdGFwIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZXZlbnQudGltZVN0YW1wIC0gbGFzdENsaWNrVGltZSkgPCB0YXBkZWxheSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxOZXh0Q2xpY2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZXZlbnQudGltZVN0YW1wIC0gdHJhY2tpbmdDbGlja1N0YXJ0KSA+IHRhcFRpbWVvdXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCB0byBwcmV2ZW50IHdyb25nIGNsaWNrIGNhbmNlbCBvbiBpbnB1dCBcclxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxOZXh0Q2xpY2sgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGFzdENsaWNrVGltZSA9IGV2ZW50LnRpbWVTdGFtcDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHJhY2tpbmdDbGlja1N0YXJ0ID0gdHJhY2tpbmdDbGlja1N0YXJ0O1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB0cmFja2luZ0NsaWNrU3RhcnQgPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHsgaXRlbTogZXYuY3VycmVudFRhcmdldCwgcmFpc2VFdmVudDogdHJ1ZSB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uVG91Y2hDYW5jZWwoZXYpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmFja2luZ0NsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25LZXlEb3duKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5Q29kZSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBjb250cm9sIGtleUNvZGVcclxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5FTlRFUiB8fCBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlNQQUNFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRlclNwYWNlR2V0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRlclNwYWNlR2V0dGVyKCRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6ICRlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogc2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTogJGVsZW1lbnQuZmluZCgnLnNlbGVjdGVkJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuTEVGVF9BUlJPVyB8fCBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IG5leHQgc2VsZWN0YWJsZSBjb250cm9sIGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbXMgPSAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArIG1vZGlmaWVyKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmMgPSAoa2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fCBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1cpID8gMSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGVkSW5kZXggPSBzZWxlY3RlZEluZGV4ICsgaW5jO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBuZXh0IGNvbnRyb2wgYXMgc2VsZWN0ZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oeyBpdGVtSW5kZXg6IG5ld1NlbGVjdGVkSW5kZXgsIGl0ZW1zOiBpdGVtcywgcmFpc2VFdmVudDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRm9jdXNJbihldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIENob29zZSBzZWxlY3RlZCBlbGVtZW50XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW1zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArICcuc2VsZWN0ZWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIGFyZSBub3Qgc2VsZWN0ZWQgZWxlbWVudHMgdGhlbiBwaWNrIHRoZSBmaXJzdCBvbmVcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gaW5kZXhHZXR0ZXIoJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArIG1vZGlmaWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7IGl0ZW1JbmRleDogc2VsZWN0ZWRJbmRleCB8fCAwLCBpdGVtczogaXRlbXMsIHJhaXNlRXZlbnQ6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRm9jdXNPdXQoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArICcubWQtZm9jdXNlZCcgKyBtb2RpZmllcikucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbn0pKCk7XHJcblxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XHJcblxyXG4oZnVuY3Rpb24oKXtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwVW5zYXZlZENoYW5nZXNcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKFwicGlwVW5zYXZlZENoYW5nZXNcIiwgZnVuY3Rpb24gKCR3aW5kb3csICRyb290U2NvcGUpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0FFJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlJyxcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzTWVzc2FnZTogJ0BwaXBVbnNhdmVkQ2hhbmdlc01lc3NhZ2UnLFxyXG4gICAgICAgICAgICAgICAgYWZ0ZXJMZWF2ZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0FmdGVyTGVhdmUnLFxyXG4gICAgICAgICAgICAgICAgY2FuY2VsTGVhdmU6ICcmcGlwVW5zYXZlZENoYW5nZXNDYW5jZWxMZWF2ZSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlOiBhbnkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9uYmVmb3JldW5sb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS51bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJHJvdXRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS51bnNhdmVkQ2hhbmdlc01lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgdW5iaW5kRnVuYyA9ICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlKCkgJiYgISR3aW5kb3cuY29uZmlybSgkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRyb3V0aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oJHNjb3BlLmNhbmNlbExlYXZlKSAmJiAkc2NvcGUuY2FuY2VsTGVhdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oJHNjb3BlLmFmdGVyTGVhdmUpICYmICRzY29wZS5hZnRlckxlYXZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAkd2luZG93Lm9uYmVmb3JldW5sb2FkID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB1bmJpbmRGdW5jKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbn0pKCk7XHJcblxyXG4iXX0=