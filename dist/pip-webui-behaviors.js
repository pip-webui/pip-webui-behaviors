(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.pip || (g.pip = {})).behaviors = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
{
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
}
},{}],2:[function(require,module,exports){
{
    var FocusedLink_1 = (function () {
        function FocusedLink_1($scope, $element, $attrs, $timeout, $mdConstant, $window) {
            var _this = this;
            this.$scope = $scope;
            this.$element = $element;
            this.$timeout = $timeout;
            this.$mdConstant = $mdConstant;
            this.$window = $window;
            this.opacityDelta = 0.4;
            this.opacityLimit = 0.5;
            $element.on('keydown', function (e) {
                console.log('this.controls', _this.controls);
                _this.keydownListener(e);
            });
            $timeout(function () {
                console.log('here');
                _this.init();
            });
            if ($attrs.ngModel) {
                $scope.$watch('ngModel', function () {
                    $timeout(this.init);
                }, true);
            }
            if ($attrs.pipFocusedData) {
                $scope.$watch('pipFocusedData', function () {
                    $timeout(this.init);
                }, true);
            }
        }
        FocusedLink_1.prototype.init = function () {
            var _this = this;
            var selector = this.$scope.pipWithHidden && this.$scope.pipWithHidden() ? '.pip-focusable' : '.pip-focusable:visible';
            this.controls = this.$element.find(selector);
            this.controlsLength = this.controls.length;
            this.checkTabindex(this.controls);
            this.controls.on('focus', function (event) {
                var target = event.currentTarget;
                if ($(target).hasClass('md-focused')) {
                    return;
                }
                if (_this.$scope.pipRebind && _this.$scope.pipRebind()) {
                    _this.init();
                }
                _this.$element.addClass('pip-focused-container');
                if (!_this.$scope.pipFocusedOpacity || !_this.$scope.pipFocusedOpacity()) {
                    _this.color = $(target).css('backgroundColor');
                    $(target).css('backgroundColor', _this.rgba(_this.color));
                    $(target).addClass('md-focused');
                }
                else {
                    $(target).addClass('md-focused md-focused-opacity');
                }
            }).on('focusout', function (event) {
                var target = event.currentTarget;
                if (!$(target).hasClass('md-focused')) {
                    return;
                }
                _this.$element.removeClass('pip-focused-container');
                if (!_this.$scope.pipFocusedOpacity || !_this.$scope.pipFocusedOpacity()) {
                    $(target).css('backgroundColor', "");
                    $(target).removeClass('md-focused md-focused-opacity');
                }
                else {
                    $(target).removeClass('md-focused');
                }
            });
        };
        FocusedLink_1.prototype.rgba = function (color) {
            if (this.$scope.pipFocusedColor && this.$scope.pipFocusedColor()) {
                return this.$scope.pipFocusedColor();
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
            if (opacity < this.opacityLimit) {
                opacity += this.opacityDelta;
            }
            else {
                opacity -= this.opacityDelta;
            }
            return 'rgba(' + red + ', ' + blue + ', ' + green + ', ' + opacity + ')';
        };
        FocusedLink_1.prototype.setTabindex = function (element, value) {
            element.attr('tabindex', value);
        };
        FocusedLink_1.prototype.checkTabindex = function (controls) {
            var index = _.findIndex(controls, function (c) {
                return c['tabindex'] > -1;
            });
            if (index == -1 && controls.length > 0 && this.$scope.pipFocusedTabindex) {
                this.setTabindex(angular.element(controls[0]), this.$scope.pipFocusedTabindex());
            }
        };
        FocusedLink_1.prototype.keydownListener = function (e) {
            var keyCode = e.which || e.keyCode;
            if (keyCode == this.$mdConstant.KEY_CODE.LEFT_ARROW ||
                keyCode == this.$mdConstant.KEY_CODE.UP_ARROW ||
                keyCode == this.$mdConstant.KEY_CODE.RIGHT_ARROW ||
                keyCode == this.$mdConstant.KEY_CODE.DOWN_ARROW) {
                e.preventDefault();
                var increment = (keyCode == this.$mdConstant.KEY_CODE.RIGHT_ARROW || keyCode == this.$mdConstant.KEY_CODE.DOWN_ARROW) ? 1 : -1, moveToControl = this.controls.index(this.controls.filter(".md-focused")) + increment;
                if (moveToControl >= 0 && moveToControl < this.controlsLength) {
                    this.controls[moveToControl].focus();
                }
            }
        };
        return FocusedLink_1;
    }());
    var Focused = function ($timeout, $mdConstant, $window) {
        return {
            scope: {
                pipFocusedColor: '&?',
                pipFocusedRebind: '&?',
                pipFocusedTabindex: '&?',
                pipFocusedOpacity: '&?',
                pipFocusedData: '&?',
                pipWithHidden: '&?',
                pipRebind: '&?'
            },
            link: function ($scope, $element, $attrs) {
                new FocusedLink_1($scope, $element, $attrs, $timeout, $mdConstant, $window);
            }
        };
    };
    Focused.$inject = ['$timeout', '$mdConstant', '$window'];
    angular.module("pipFocused", [])
        .directive('pipFocused', Focused);
}
},{}],3:[function(require,module,exports){
angular.module('pipBehaviors', [
    'pipFocused',
    'pipSelected',
    'pipInfiniteScroll',
    'pipUnsavedChanges',
    'pipDraggable',
    'pipShortcuts'
]);
},{}],4:[function(require,module,exports){
{
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
}
},{}],5:[function(require,module,exports){
"use strict";
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
"use strict";
var KeyboardShortcut_1 = require("./KeyboardShortcut");
var ShortcutsRegisterService = (function () {
    ShortcutsRegisterService.$inject = ['$log', 'option'];
    function ShortcutsRegisterService($log, option) {
        "ngInject";
        this._log = $log;
        this._defaultOption = option ? _.defaults(option, this.getDefaultOption()) : this.getDefaultOption();
        this._shortcuts = {};
    }
    ShortcutsRegisterService.prototype.getDefaultOption = function () {
        var defaultOption = {
            Type: KeyboardShortcut_1.KeyboardEvent.Keydown,
            Propagate: false,
            DisableInInput: false,
            Target: document,
            Keycode: null
        };
        return defaultOption;
    };
    ShortcutsRegisterService.prototype.checkAddShortcut = function (element, shorcutCombination, callback) {
        if (!element) {
            this._log.error('Register shortcut: element undentified!');
            return false;
        }
        if (!shorcutCombination) {
            this._log.error('Register shortcut: shorcut combination undentified!');
            return false;
        }
        if (!callback) {
            this._log.error('Register shortcut: shorcut callback undentified!');
            return false;
        }
        return true;
    };
    Object.defineProperty(ShortcutsRegisterService.prototype, "shorcuts", {
        get: function () {
            return this._shortcuts;
        },
        enumerable: true,
        configurable: true
    });
    ShortcutsRegisterService.prototype.add = function (shorcutName, callback, option) {
        this.remove(shorcutName);
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
    ShortcutsRegisterService.prototype.remove = function (shorcutName) {
        var shortcutCombination = shorcutName.toLowerCase();
        var binding = this._shortcuts[shortcutCombination];
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
    };
    return ShortcutsRegisterService;
}());
exports.ShortcutsRegisterService = ShortcutsRegisterService;
{
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
                this._service = new ShortcutsRegisterService($log, this._option);
            return this._service;
        }];
        return ShortcutsRegisterProvider;
    }());
    angular
        .module('pipShortcuts')
        .provider('pipShortcutsRegister', ShortcutsRegisterProvider);
}
},{"./KeyboardShortcut":5}],7:[function(require,module,exports){
"use strict";
var ShortcutController = (function () {
    ShortcutController.$inject = ['$element', '$attrs', '$scope', '$log', '$parse', 'pipShortcutsRegister'];
    function ShortcutController($element, $attrs, $scope, $log, $parse, pipShortcutsRegister) {
        "ngInject";
        var _this = this;
        if ($attrs.pipShortcutAction) {
            this.actionShortcuts = $parse($attrs.pipShortcutAction);
            this.actionShortcuts($scope, { $event: {} });
        }
        else {
            $log.error('Shorcunt action does not set.');
            return;
        }
        if ($attrs.pipShortcutName && _.isString($attrs.pipShortcutName)) {
            this.nameShortcuts = $attrs.pipShortcutName;
        }
        else {
            $log.error('Shorcunt name does not set.');
            return;
        }
        this.options = $attrs.pipShorcutOptions ? $attrs.pipShorcutOptions : {};
        this.options.Target = $element;
        pipShortcutsRegister.add(this.nameShortcuts, function (e) {
            _this.actionShortcuts($scope, { $event: { 'e': e } });
        }, this.options);
    }
    ShortcutController.prototype.keypressShortcut = function (action) {
        this.actionShortcuts();
    };
    return ShortcutController;
}());
{
    var shortcutsDirective = function () {
        return {
            restrict: 'A',
            scope: false,
            controller: ShortcutController
        };
    };
    angular
        .module('pipShortcuts')
        .directive('pipShortcut', shortcutsDirective);
}
},{}],8:[function(require,module,exports){
"use strict";
exports.ShortcutsChangedEvent = 'pipShortcutsChanged';
var ShortcutItem = (function () {
    function ShortcutItem() {
    }
    return ShortcutItem;
}());
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
        this.$rootScope = $rootScope;
        this.$window = $window;
        this.$location = $location;
        this.$injector = $injector;
        this.pipShortcutsRegister = pipShortcutsRegister;
        this._config = this.config;
        this._oldConfig = _.cloneDeep(this.config);
        this.addShortcuts(this.config.globalShortcuts);
        this.addShortcuts(this.config.localShortcuts);
    }
    ShortcutsService.prototype.sendChangeEvent = function () {
        this.removeShortcuts(this._oldConfig.globalShortcuts);
        this.removeShortcuts(this._oldConfig.localShortcuts);
        this.addShortcuts(this.config.globalShortcuts);
        this.addShortcuts(this.config.localShortcuts);
        this.$rootScope.$emit(exports.ShortcutsChangedEvent, this.config);
        this._oldConfig = _.cloneDeep(this.config);
    };
    ShortcutsService.prototype.removeShortcuts = function (collection) {
        var _this = this;
        _.each(collection, function (k) {
            _this.pipShortcutsRegister.remove(k.shortcut);
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
            this.$window.location.href = shorcut.href;
            return;
        }
        if (shorcut.url) {
            this.$location.url(shorcut.url);
            return;
        }
        if (shorcut.state) {
            if (this.$injector.has('$state')) {
                var $state = this.$injector.get('$state');
                $state['go'](shorcut.state, shorcut.stateParams);
            }
            return;
        }
        if (shorcut.event) {
            this.$rootScope.$broadcast(shorcut.event);
        }
        else {
            this.$rootScope.$broadcast('pipShortcutKeypress', shorcut.shortcut);
        }
    };
    ShortcutsService.prototype.addShortcuts = function (collection) {
        var _this = this;
        var generalOptions = this.config.defaultOptions ? this.config.defaultOptions : {};
        _.each(collection, function (k) {
            var option = k.options ? k.options : generalOptions;
            var target;
            target = k.target ? k.target : k.targetId;
            option.Target = target;
            _this.pipShortcutsRegister.add(k.shortcut, function (e) {
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
    ShortcutsService.prototype.onLocal = function (localShortcuts) {
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
"use strict";
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
{
    var thisModule = angular.module("pipSelected", []);
    thisModule.directive('pipSelected', ['$parse', '$mdConstant', '$timeout', function ($parse, $mdConstant, $timeout) {
        return {
            restrict: 'A',
            scope: false,
            link: function ($scope, $element, $attrs) {
                var indexGetter = $attrs.pipSelected ? $parse($attrs.pipSelected) : null, indexSetter = indexGetter ? indexGetter.assign : null, idGetter = $attrs.pipSelectedId ? $parse($attrs.pipSelectedId) : null, idSetter = idGetter ? idGetter.assign : null, changeGetter = $attrs.pipSelect ? $parse($attrs.pipSelect) : null, enterSpaceGetter = $attrs.pipEnterSpacePress ? $parse($attrs.pipEnterSpacePress) : null, noScroll = $attrs.pipNoScroll, modifier = $attrs.pipSkipHidden ? ':visible' : '', className = $attrs.pipTreeList ? '.pip-selectable-tree' : '.pip-selectable', selectedIndex = indexGetter($scope), currentElementTabinex = $element.attr('tabindex'), pipSelectedWatch = $attrs.pipSelectedWatch, isScrolled = false;
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
                if (!$attrs.pipTreeList) {
                    $scope.$watch(indexGetter, function (newSelectedIndex) {
                        selectItem({
                            itemIndex: newSelectedIndex
                        });
                    });
                }
                else {
                    $scope.$watch(idGetter, function (newSelectedId) {
                        setTimeout(function () {
                            selectItem({
                                itemId: newSelectedId,
                                raiseEvent: true
                            });
                        }, 0);
                    });
                }
                if (pipSelectedWatch) {
                    $scope.$watch(pipSelectedWatch, function () {
                        setTimeout(function () {
                            selectedIndex = indexGetter($scope);
                            selectItem({
                                itemIndex: selectedIndex
                            });
                        }, 100);
                    });
                }
                selectItem({
                    itemIndex: selectedIndex,
                    items: $element.find(className)
                });
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
                    selectItem({
                        item: event.currentTarget,
                        raiseEvent: true
                    });
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
                    selectItem({
                        item: ev.currentTarget,
                        raiseEvent: true
                    });
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
                        selectItem({
                            itemIndex: newSelectedIndex,
                            items: items,
                            raiseEvent: true
                        });
                    }
                }
                function onFocusIn(event) {
                    var items, selectedItem = $element.find(className + '.selected');
                    selectedItem.addClass('md-focused');
                    if (selectedItem.length === 0) {
                        selectedIndex = indexGetter($scope);
                        items = $element.find(className + modifier);
                        selectItem({
                            itemIndex: selectedIndex || 0,
                            items: items,
                            raiseEvent: true
                        });
                    }
                }
                function onFocusOut(event) {
                    $element.find(className + '.md-focused' + modifier).removeClass('md-focused');
                }
            }
        };
    }]);
}
},{}],11:[function(require,module,exports){
{
    var UnsavedChangesLink_1 = (function () {
        function UnsavedChangesLink_1($scope, $window) {
            $window.onbeforeunload = function () {
                if ($scope.unsavedChangesAvailable()) {
                    return $scope.unsavedChangesMessage;
                }
            };
            var unbindFunc = $scope.$on('$stateChangeStart', function (event) {
                if ($scope.unsavedChangesAvailable() && !$window.confirm($scope.unsavedChangesMessage)) {
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
        return UnsavedChangesLink_1;
    }());
    var UnsavedChanges = function ($window) {
        return {
            restrict: 'AE',
            scope: {
                unsavedChangesAvailable: '&pipUnsavedChangesAvailable',
                unsavedChangesMessage: '@pipUnsavedChangesMessage',
                afterLeave: '&pipUnsavedChangesAfterLeave',
                cancelLeave: '&pipUnsavedChangesCancelLeave'
            },
            link: function ($scope) {
                new UnsavedChangesLink_1($scope, $window);
            }
        };
    };
    UnsavedChanges.$inject = ['$window'];
    angular.module("pipUnsavedChanges", [])
        .directive("pipUnsavedChanges", UnsavedChanges);
}
},{}]},{},[1,2,3,4,9,5,6,7,8,10,11])(11)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZHJhZ2dhYmxlL2RyYWdnYWJsZS50cyIsInNyYy9mb2N1c2VkL0ZvY3VzZWQudHMiLCJzcmMvaW5kZXgudHMiLCJzcmMvaW5maW5pdGVfc2Nyb2xsL2luZmluaXRlU2Nyb2xsLnRzIiwic3JjL2tleWJvYXJkX3Nob3J0Y3V0cy9LZXlib2FyZFNob3J0Y3V0LnRzIiwic3JjL2tleWJvYXJkX3Nob3J0Y3V0cy9TaG9yY3V0c1JlZ2lzdGVyU2VydmljZS50cyIsInNyYy9rZXlib2FyZF9zaG9ydGN1dHMvU2hvcnRjdXREaXJlY3RpdmUudHMiLCJzcmMva2V5Ym9hcmRfc2hvcnRjdXRzL1Nob3J0Y3V0c1NlcnZpY2UudHMiLCJzcmMva2V5Ym9hcmRfc2hvcnRjdXRzL2luZGV4LnRzIiwic3JjL3NlbGVjdGVkL3NlbGVjdGVkLnRzIiwic3JjL3Vuc2F2ZWRfY2hhbmdlcy91bnNhdmVkQ2hhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0NBLENBQUM7SUFDRyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVwRCxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRTtRQUUvQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDakIsS0FBSyxDQUFDLFVBQVUsR0FBRyxVQUFVLEtBQUs7WUFDOUIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixDQUFDO1lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxTQUFT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QUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDM0QsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUU7Z0JBQ25CLE9BQU8sQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO2dCQUM5QixVQUFVLEVBQUUsQ0FBQztZQUNqQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFDTCwyQkFBQztJQUFELENBekJBLEFBeUJDLElBQUE7SUFFRCxJQUFNLGNBQWMsR0FBRyxVQUFVLE9BQTBCO1FBQ3ZELE1BQU0sQ0FBQztZQUNILFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFO2dCQUNILHVCQUF1QixFQUFFLDZCQUE2QjtnQkFDdEQscUJBQXFCLEVBQUUsMkJBQTJCO2dCQUNsRCxVQUFVLEVBQUUsOEJBQThCO2dCQUMxQyxXQUFXLEVBQUUsK0JBQStCO2FBQy9DO1lBQ0QsSUFBSSxFQUFFLFVBQVUsTUFBMkI7Z0JBQ3ZDLElBQUksb0JBQWtCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLENBQUM7U0FDSixDQUFDO0lBQ04sQ0FBQyxDQUFBO0lBRUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7U0FDbEMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxyXG57XHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwRHJhZ2dhYmxlXCIsIFtdKTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLnNlcnZpY2UoJ3BpcERyYWdnYWJsZScsIGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuICAgICAgICBzY29wZS5pbnB1dEV2ZW50ID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChldmVudC50b3VjaGVzKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy9DaGVja2luZyBib3RoIGlzIG5vdCByZWR1bmRlbnQuIElmIG9ubHkgY2hlY2sgaWYgdG91Y2hlcyBpc0RlZmluZWQsIGFuZ3VsYXJqcyBpc0RlZm5pZWQgd2lsbCByZXR1cm4gZXJyb3IgYW5kIHN0b3AgdGhlIHJlbWFpbmluZyBzY3JpcHR5IGlmIGV2ZW50Lm9yaWdpbmFsRXZlbnQgaXMgbm90IGRlZmluZWQuXHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50Lm9yaWdpbmFsRXZlbnQpICYmIGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGV2ZW50O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcERyYWcnLFxyXG4gICAgICAgIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcGFyc2UsICRkb2N1bWVudCwgJHdpbmRvdywgcGlwRHJhZ2dhYmxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZTogYW55LCBlbGVtZW50LCBhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudmFsdWUgPSBhdHRycy5uZ0RyYWc7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIExPTkdfUFJFU1MgPSA1MDsgLy8gNTBtcyBmb3IgbG9uZ3ByZXNzXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9mZnNldCwgX2NlbnRlckFuY2hvciA9IGZhbHNlLCBfbXgsIF9teSwgX3R4LCBfdHksIF9tcngsIF9tcnk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9oYXNUb3VjaCA9ICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpIHx8ICg8YW55PndpbmRvdykuRG9jdW1lbnRUb3VjaDsgLy8gJiYgZG9jdW1lbnQgaW5zdGFuY2VvZiBEb2N1bWVudFRvdWNoOyAvLyBEb2N1bWVudFRvdWNoIGlzIG5vdCBkZWZpbmVkIVxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfcHJlc3NFdmVudHMgPSAndG91Y2hzdGFydCBtb3VzZWRvd24nO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfbW92ZUV2ZW50cyA9ICd0b3VjaG1vdmUgbW91c2Vtb3ZlJztcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX3JlbGVhc2VFdmVudHMgPSAndG91Y2hlbmQgbW91c2V1cCc7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kcmFnSGFuZGxlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyB0byBpZGVudGlmeSB0aGUgZWxlbWVudCBpbiBvcmRlciB0byBwcmV2ZW50IGdldHRpbmcgc3VwZXJmbG91cyBldmVudHMgd2hlbiBhIHNpbmdsZSBlbGVtZW50IGhhcyBib3RoIGRyYWcgYW5kIGRyb3AgZGlyZWN0aXZlcyBvbiBpdC5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX215aWQgPSBzY29wZS4kaWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kYXRhID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kcmFnT2Zmc2V0ID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kcmFnRW5hYmxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX3ByZXNzVGltZXIgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX2VsZW1lbnRTdHlsZTogYW55ID0ge307XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdGFydENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdGFydCkgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3RvcENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdG9wKSB8fCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdWNjZXNzQ2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N1Y2Nlc3MpIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFsbG93VHJhbnNmb3JtID0gYW5ndWxhci5pc0RlZmluZWQoYXR0cnMuYWxsb3dUcmFuc2Zvcm0pID8gc2NvcGUuJGV2YWwoYXR0cnMuYWxsb3dUcmFuc2Zvcm0pIDogZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBnZXREcmFnRGF0YSA9ICRwYXJzZShhdHRycy5waXBEcmFnRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsU2Nyb2xsID0gdG9Cb29sZWFuKGF0dHJzLnBpcFZlcnRpY2FsU2Nyb2xsKSB8fCB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBob3Jpem9udGFsU2Nyb2xsID0gdG9Cb29sZWFuKGF0dHJzLnBpcEhvcml6b250YWxTY3JvbGwpIHx8IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRpb25EaXN0YW5jZSA9IHBhcnNlRmxvYXQoYXR0cnMucGlwQWN0aXZhdGlvbkRpc3RhbmNlKSB8fCA3NSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRGlzdGFuY2UgPSBwYXJzZUZsb2F0KGF0dHJzLnBpcFNjcm9sbERpc3RhbmNlKSB8fCA1MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsUGFyZW50ID0gZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQod2luZG93KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyR2V0dGVyID0gJHBhcnNlKGF0dHJzLnBpcFNjcm9sbENvbnRhaW5lcik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlcmVnaXN0cmF0aW9uIGZ1bmN0aW9uIGZvciBtb3VzZSBtb3ZlIGV2ZW50cyBpbiAkcm9vdFNjb3BlIHRyaWdnZXJlZCBieSBqcUxpdGUgdHJpZ2dlciBoYW5kbGVyXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lciA9IGFuZ3VsYXIubm9vcDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7IC8vIHByZXZlbnQgbmF0aXZlIGRyYWdcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgdG8gc2VlIGlmIGRyYWcgaGFuZGxlKHMpIHdhcyBzcGVjaWZpZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgcXVlcnlTZWxlY3RvckFsbCBpcyBhdmFpbGFibGUsIHdlIHVzZSB0aGlzIGluc3RlYWQgb2YgZmluZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhcyBKUUxpdGUgZmluZCBpcyBsaW1pdGVkIHRvIHRhZ25hbWVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkcmFnSGFuZGxlczogYW55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yQWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnSGFuZGxlcyA9IGFuZ3VsYXIuZWxlbWVudChlbGVtZW50WzBdLnF1ZXJ5U2VsZWN0b3JBbGwoJ1twaXAtZHJhZy1oYW5kbGVdJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0hhbmRsZXMgPSBlbGVtZW50LmZpbmQoJ1twaXAtZHJhZy1oYW5kbGVdJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRyYWdIYW5kbGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdIYW5kbGUgPSBkcmFnSGFuZGxlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVMaXN0ZW5lcnModHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHNjcm9sbCBjb250YWluZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbFBhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KGVsZW1lbnQucGFyZW50KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGF0dHJzLnBpcFNjcm9sbENvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHNjcm9sbENvbnRhaW5lckdldHRlcihzY29wZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHdpbmRvdyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvQm9vbGVhbih2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPT0gJzEnIHx8IHZhbHVlID09ICd0cnVlJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIG9uRGVzdHJveSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5waXBEcmFnLCBvbkVuYWJsZUNoYW5nZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5waXBDZW50ZXJBbmNob3IsIG9uQ2VudGVyQW5jaG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2lyZSB1cCB0b3VjaCBldmVudHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9kcmFnSGFuZGxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUocykgc3BlY2lmaWVkLCB1c2UgdGhvc2UgdG8gaW5pdGlhdGUgZHJhZ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdIYW5kbGUub24oX3ByZXNzRXZlbnRzLCBvbnByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGhhbmRsZShzKSBzcGVjaWZpZWQsIHVzZSB0aGUgZWxlbWVudCBhcyB0aGUgaGFuZGxlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKF9wcmVzc0V2ZW50cywgb25wcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfaGFzVG91Y2ggJiYgZWxlbWVudFswXS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09IFwiaW1nXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTsgLy8gcHJldmVudCBuYXRpdmUgZHJhZyBmb3IgaW1hZ2VzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EZXN0cm95KGVuYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVMaXN0ZW5lcnMoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdFbmFibGVkID0gKG5ld1ZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkNlbnRlckFuY2hvcihuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQobmV3VmFsKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jZW50ZXJBbmNob3IgPSAobmV3VmFsIHx8ICd0cnVlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBpc0NsaWNrYWJsZUVsZW1lbnQoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmlzRGVmaW5lZChhbmd1bGFyLmVsZW1lbnQoZXZ0LnRhcmdldCkuYXR0cihcInBpcC1jYW5jZWwtZHJhZ1wiKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8qXHJcbiAgICAgICAgICAgICAgICAgICAgICogV2hlbiB0aGUgZWxlbWVudCBpcyBjbGlja2VkIHN0YXJ0IHRoZSBkcmFnIGJlaGF2aW91clxyXG4gICAgICAgICAgICAgICAgICAgICAqIE9uIHRvdWNoIGRldmljZXMgYXMgYSBzbWFsbCBkZWxheSBzbyBhcyBub3QgdG8gcHJldmVudCBuYXRpdmUgd2luZG93IHNjcm9sbGluZ1xyXG4gICAgICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ucHJlc3MoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2RyYWdFbmFibGVkKXJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NsaWNrYWJsZUVsZW1lbnQoZXZ0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0LnR5cGUgPT0gXCJtb3VzZWRvd25cIiAmJiBldnQuYnV0dG9uICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvIG5vdCBzdGFydCBkcmFnZ2luZyBvbiByaWdodC1jbGlja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlRWxlbWVudFN0eWxlcygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9oYXNUb3VjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9wcmVzc1RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmxvbmdwcmVzcyhldnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgTE9OR19QUkVTUyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX21vdmVFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vbihfcmVsZWFzZUV2ZW50cywgY2FuY2VsUHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25sb25ncHJlc3MoZXZ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNhdmVFbGVtZW50U3R5bGVzKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZWxlbWVudFN0eWxlLmxlZnQgPSBlbGVtZW50LmNzcygnY3NzJykgfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS50b3AgPSBlbGVtZW50LmNzcygndG9wJykgfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS5wb3NpdGlvbiA9IGVsZW1lbnQuY3NzKCdwb3NpdGlvbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZWxlbWVudFN0eWxlLndpZHRoID0gZWxlbWVudC5jc3MoJ3dpZHRoJyk7ICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY2FuY2VsUHJlc3MoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChfcHJlc3NUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vZmYoX21vdmVFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9mZihfcmVsZWFzZUV2ZW50cywgY2FuY2VsUHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25sb25ncHJlc3MoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2RyYWdFbmFibGVkKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWxsb3dUcmFuc2Zvcm0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZHJhZ09mZnNldCA9IG9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZHJhZ09mZnNldCA9IHtsZWZ0OiBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQsIHRvcDogZG9jdW1lbnQuYm9keS5zY3JvbGxUb3B9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxhbnk+ZWxlbWVudCkuY2VudGVyWCA9IGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGggLyAyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPGFueT5lbGVtZW50KS5jZW50ZXJZID0gZWxlbWVudFswXS5vZmZzZXRIZWlnaHQgLyAyO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX214ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX215ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX21yeCA9IF9teCAtIG9mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXJ5ID0gX215IC0gb2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9jZW50ZXJBbmNob3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eCA9IF9teCAtICg8YW55PmVsZW1lbnQpLmNlbnRlclggLSAkd2luZG93LnBhZ2VYT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R5ID0gX215IC0gKDxhbnk+ZWxlbWVudCkuY2VudGVyWSAtICR3aW5kb3cucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHggPSBfbXggLSBfbXJ4IC0gJHdpbmRvdy5wYWdlWE9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eSA9IF9teSAtIF9tcnkgLSAkd2luZG93LnBhZ2VZT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX21vdmVFdmVudHMsIG9ubW92ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vbihfcmVsZWFzZUV2ZW50cywgb25yZWxlYXNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBldmVudCBpcyB1c2VkIHRvIHJlY2VpdmUgbWFudWFsbHkgdHJpZ2dlcmVkIG1vdXNlIG1vdmUgZXZlbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGpxTGl0ZSB1bmZvcnR1bmF0ZWx5IG9ubHkgc3VwcG9ydHMgdHJpZ2dlckhhbmRsZXIoLi4uKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWUgaHR0cDovL2FwaS5qcXVlcnkuY29tL3RyaWdnZXJIYW5kbGVyL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbignZHJhZ2dhYmxlOl90cmlnZ2VySGFuZGxlck1vdmUnLCBvbm1vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbignZHJhZ2dhYmxlOl90cmlnZ2VySGFuZGxlck1vdmUnLCBmdW5jdGlvbiAoZXZlbnQsIG9yaWdFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25tb3ZlKG9yaWdFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25tb3ZlKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbGVtZW50Lmhhc0NsYXNzKCdwaXAtZHJhZ2dpbmcnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RhdGEgPSBnZXREcmFnRGF0YShzY29wZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOnN0YXJ0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IF9teCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBfbXksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHg6IF90eCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eTogX3R5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBldnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBfZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9uRHJhZ1N0YXJ0Q2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdGFydENhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IF9kYXRhLCAkZXZlbnQ6IGV2dH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXggPSBwaXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VYO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXkgPSBwaXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VZO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhvcml6b250YWxTY3JvbGwgfHwgdmVydGljYWxTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdUb1Njcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2NlbnRlckFuY2hvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R4ID0gX214IC0gKDxhbnk+ZWxlbWVudCkuY2VudGVyWCAtIF9kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHkgPSBfbXkgLSAoPGFueT5lbGVtZW50KS5jZW50ZXJZIC0gX2RyYWdPZmZzZXQudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R4ID0gX214IC0gX21yeCAtIF9kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHkgPSBfbXkgLSBfbXJ5IC0gX2RyYWdPZmZzZXQudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3ZlRWxlbWVudChfdHgsIF90eSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTptb3ZlJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogX214LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogX215LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHg6IF90eCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5OiBfdHksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IF9kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdWlkOiBfbXlpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdPZmZzZXQ6IF9kcmFnT2Zmc2V0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25yZWxlYXNlKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOmVuZCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IF9teCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IF9teSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR4OiBfdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eTogX3R5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGV2dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBfZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBvbkRyYWdDb21wbGV0ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpZDogX215aWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnZ2luZycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnBhcmVudCgpLmZpbmQoJy5waXAtZHJhZy1lbnRlcicpLnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNldCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub2ZmKF9tb3ZlRXZlbnRzLCBvbm1vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub2ZmKF9yZWxlYXNlRXZlbnRzLCBvbnJlbGVhc2UpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9uRHJhZ1N0b3BDYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdG9wQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogX2RhdGEsICRldmVudDogZXZ0fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdDb21wbGV0ZShldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvbkRyYWdTdWNjZXNzQ2FsbGJhY2spcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N1Y2Nlc3NDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBfZGF0YSwgJGV2ZW50OiBldnR9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZXNldCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFsbG93VHJhbnNmb3JtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe3RyYW5zZm9ybTogJycsICd6LWluZGV4JzogJycsICctd2Via2l0LXRyYW5zZm9ybSc6ICcnLCAnLW1zLXRyYW5zZm9ybSc6ICcnfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moeydwb3NpdGlvbic6IF9lbGVtZW50U3R5bGUucG9zaXRpb24sIHRvcDogX2VsZW1lbnRTdHlsZS50b3AsIGxlZnQ6IF9lbGVtZW50U3R5bGUubGVmdCwgJ3otaW5kZXgnOiAnJywgd2lkdGg6IF9lbGVtZW50U3R5bGUud2lkdGh9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gbW92ZUVsZW1lbnQoeCwgeSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZVdpZHRoID0gZWxlbWVudC5jc3MoJ3dpZHRoJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbGxvd1RyYW5zZm9ybSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiA5OTk5OSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnbWF0cml4M2QoMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgJyArIHggKyAnLCAnICsgeSArICcsIDAsIDEpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnLW1zLXRyYW5zZm9ybSc6ICdtYXRyaXgoMSwgMCwgMCwgMSwgJyArIHggKyAnLCAnICsgeSArICcpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xlZnQnOiB4ICsgJ3B4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAndG9wJzogeSArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2ZpeGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogZVdpZHRoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gZHJhZ1RvU2Nyb2xsKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2Nyb2xsWCA9IDAsIHNjcm9sbFkgPSAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vZmZzZXQoKSB8fCB7bGVmdDogMCwgdG9wOiAwfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaG9yaXpvbnRhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyTGVmdCA9IG9mZnNldChzY3JvbGxDb250YWluZXIpLmxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyV2lkdGggPSBzY3JvbGxDb250YWluZXIuaW5uZXJXaWR0aCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclJpZ2h0ID0gY29udGFpbmVyTGVmdCArIGNvbnRhaW5lcldpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoX214IC0gY29udGFpbmVyTGVmdCkgPCBhY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxYID0gLXNjcm9sbERpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKGNvbnRhaW5lclJpZ2h0IC0gX214KSA8IGFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFggPSBzY3JvbGxEaXN0YW5jZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZlcnRpY2FsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3AgPSBvZmZzZXQoc2Nyb2xsQ29udGFpbmVyKS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVySGVpZ2h0ID0gc2Nyb2xsQ29udGFpbmVyLmlubmVySGVpZ2h0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gY29udGFpbmVyVG9wICsgY29udGFpbmVySGVpZ2h0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoX215IC0gY29udGFpbmVyVG9wKSA8IGFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFkgPSAtc2Nyb2xsRGlzdGFuY2UgKyAzMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKChjb250YWluZXJCb3R0b20gLSBfbXkpIDwgYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWSA9IHNjcm9sbERpc3RhbmNlIC0gMzA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbFggIT09IDAgfHwgc2Nyb2xsWSAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsTGVmdCA9IHNjcm9sbENvbnRhaW5lci5zY3JvbGxMZWZ0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsVG9wID0gc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci5zY3JvbGxMZWZ0KGNvbnRhaW5lclNjcm9sbExlZnQgKyBzY3JvbGxYKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgc2Nyb2xsWSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcERyb3AnLCBcclxuICAgICAgICBmdW5jdGlvbiAoJHBhcnNlLCAkdGltZW91dCwgJHdpbmRvdywgJGRvY3VtZW50LCBwaXBEcmFnZ2FibGUpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGU6IGFueSwgZWxlbWVudCwgYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudmFsdWUgPSBhdHRycy5waXBEcm9wO1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuaXNUb3VjaGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBfbGFzdERyb3BUb3VjaCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB2YXIgX215aWQgPSBzY29wZS4kaWQ7XHJcbiAgICAgICAgICAgICAgICB2YXIgX2Ryb3BFbmFibGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJvcENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyb3BTdWNjZXNzKTsvLyB8fCBmdW5jdGlvbigpe307XHJcbiAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3RhcnRDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RhcnQpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N0b3BDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RvcCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgb25EcmFnTW92ZUNhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdNb3ZlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGF0dHJzLnBpcERyb3AsIG9uRW5hYmxlQ2hhbmdlKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95Jywgb25EZXN0cm95KTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTpzdGFydCcsIG9uRHJhZ1N0YXJ0KTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTptb3ZlJywgb25EcmFnTW92ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6ZW5kJywgb25EcmFnRW5kKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRlc3Ryb3koZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkVuYWJsZUNoYW5nZShuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kcm9wRW5hYmxlZCA9IG5ld1ZhbDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdTdGFydChldnQsIG9iaikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX2Ryb3BFbmFibGVkKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBpc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMucGlwRHJhZ1N0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N0YXJ0Q2FsbGJhY2soc2NvcGUsIHskZGF0YTogb2JqLmRhdGEsICRldmVudDogb2JqfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdNb3ZlKGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJvcEVuYWJsZWQpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGlzVG91Y2hpbmcob2JqLngsIG9iai55LCBvYmouZWxlbWVudCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5waXBEcmFnTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdNb3ZlQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogb2JqLmRhdGEsICRldmVudDogb2JqfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdFbmQoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBkb24ndCBsaXN0ZW4gdG8gZHJvcCBldmVudHMgaWYgdGhpcyBpcyB0aGUgZWxlbWVudCBiZWluZyBkcmFnZ2VkXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSB1cGRhdGUgdGhlIHN0eWxlcyBhbmQgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJvcEVuYWJsZWQgfHwgX215aWQgPT09IG9iai51aWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlRHJhZ1N0eWxlcyhmYWxzZSwgb2JqLmVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjYWxsIHRoZSBwaXBEcmFnZ2FibGUgcGlwRHJhZ1N1Y2Nlc3MgZWxlbWVudCBjYWxsYmFja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqLmNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmouY2FsbGJhY2sob2JqKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLnBpcERyb3BTdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25Ecm9wQ2FsbGJhY2soc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IG9iai5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IG9iaixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRhcmdldDogc2NvcGUuJGV2YWwoc2NvcGUudmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLnBpcERyYWdTdG9wKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N0b3BDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBvYmouZGF0YSwgJGV2ZW50OiBvYmp9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVEcmFnU3R5bGVzKGZhbHNlLCBvYmouZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaXNUb3VjaGluZyhtb3VzZVgsIG1vdXNlWSwgZHJhZ0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdG91Y2hpbmcgPSBoaXRUZXN0KG1vdXNlWCwgbW91c2VZKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pc1RvdWNoaW5nID0gdG91Y2hpbmc7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvdWNoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9sYXN0RHJvcFRvdWNoID0gZWxlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlRHJhZ1N0eWxlcyh0b3VjaGluZywgZHJhZ0VsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0b3VjaGluZztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGVEcmFnU3R5bGVzKHRvdWNoaW5nLCBkcmFnRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0b3VjaGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnRWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX2xhc3REcm9wVG91Y2ggPT0gZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbGFzdERyb3BUb3VjaCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnLWVudGVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdFbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1vdmVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBoaXRUZXN0KHgsIHkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYm91bmRzID0gZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB4IC09ICRkb2N1bWVudFswXS5ib2R5LnNjcm9sbExlZnQgKyAkZG9jdW1lbnRbMF0uZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgeSAtPSAkZG9jdW1lbnRbMF0uYm9keS5zY3JvbGxUb3AgKyAkZG9jdW1lbnRbMF0uZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geCA+PSBib3VuZHMubGVmdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiB4IDw9IGJvdW5kcy5yaWdodFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiB5IDw9IGJvdW5kcy5ib3R0b21cclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgeSA+PSBib3VuZHMudG9wO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBQcmV2ZW50RHJhZycsIGZ1bmN0aW9uICgkcGFyc2UsICR0aW1lb3V0KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlOiBhbnksIGVsZW1lbnQsIGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBhYnNvcmJFdmVudF8oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCAmJiBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24gJiYgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwQ2FuY2VsRHJhZycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmZpbmQoJyonKS5hdHRyKCdwaXAtY2FuY2VsLWRyYWcnLCAncGlwLWNhbmNlbC1kcmFnJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbiIsIntcclxuICAgIGludGVyZmFjZSBGb2N1c2VkU2NvcGUgZXh0ZW5kcyBuZy5JU2NvcGUge1xyXG4gICAgICAgIHBpcEZvY3VzZWRDb2xvcjogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZFJlYmluZDogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZFRhYmluZGV4OiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBGb2N1c2VkT3BhY2l0eTogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZERhdGE6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcFdpdGhIaWRkZW46IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcFJlYmluZDogRnVuY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIEZvY3VzZWRBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIG5nTW9kZWw6IGFueTtcclxuICAgICAgICBwaXBGb2N1c2VkRGF0YTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIEZvY3VzZWRMaW5rIGltcGxlbWVudHMgbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcHJpdmF0ZSBjb250cm9sczogSlF1ZXJ5O1xyXG4gICAgICAgIHByaXZhdGUgY29udHJvbHNMZW5ndGg6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIGNvbG9yOiBzdHJpbmc7XHJcbiAgICAgICAgcHJpdmF0ZSBvcGFjaXR5RGVsdGE6IG51bWJlciA9IDAuNDtcclxuICAgICAgICBwcml2YXRlIG9wYWNpdHlMaW1pdDogbnVtYmVyID0gMC41O1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IEZvY3VzZWRTY29wZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAkYXR0cnM6IEZvY3VzZWRBdHRyaWJ1dGVzLFxyXG4gICAgICAgICAgICBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJG1kQ29uc3RhbnQ6IGFueSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZVxyXG4gICAgICAgICkge1xyXG5cclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2tleWRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3RoaXMuY29udHJvbHMnLCB0aGlzLmNvbnRyb2xzKTtcclxuICAgICAgICAgICAgICAgIHRoaXMua2V5ZG93bkxpc3RlbmVyKGUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdoZXJlJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoJGF0dHJzLm5nTW9kZWwpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ25nTW9kZWwnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQodGhpcy5pbml0KTtcclxuICAgICAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoJGF0dHJzLnBpcEZvY3VzZWREYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBGb2N1c2VkRGF0YScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dCh0aGlzLmluaXQpO1xyXG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdCgpIHtcclxuICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSB0aGlzLiRzY29wZS5waXBXaXRoSGlkZGVuICYmIHRoaXMuJHNjb3BlLnBpcFdpdGhIaWRkZW4oKSA/ICcucGlwLWZvY3VzYWJsZScgOiAnLnBpcC1mb2N1c2FibGU6dmlzaWJsZSc7XHJcbiAgICAgICAgICAgIHRoaXMuY29udHJvbHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoc2VsZWN0b3IpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xzTGVuZ3RoID0gdGhpcy5jb250cm9scy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlY2tUYWJpbmRleCh0aGlzLmNvbnRyb2xzKTtcclxuICAgICAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyc1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xzLm9uKCdmb2N1cycsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXZlbnQuY3VycmVudFRhcmdldDtcclxuICAgICAgICAgICAgICAgIGlmICgkKHRhcmdldCkuaGFzQ2xhc3MoJ21kLWZvY3VzZWQnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLiRzY29wZS5waXBSZWJpbmQgJiYgdGhpcy4kc2NvcGUucGlwUmViaW5kKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1mb2N1c2VkLWNvbnRhaW5lcicpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLiRzY29wZS5waXBGb2N1c2VkT3BhY2l0eSB8fCAhdGhpcy4kc2NvcGUucGlwRm9jdXNlZE9wYWNpdHkoKSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbG9yID0gJCh0YXJnZXQpLmNzcygnYmFja2dyb3VuZENvbG9yJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gX2NvbG9yID0gJHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKCQodGhpcylbMF0sIG51bGwpLmJhY2tncm91bmRDb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCB0aGlzLnJnYmEodGhpcy5jb2xvcikpO1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5hZGRDbGFzcygnbWQtZm9jdXNlZCcpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkuYWRkQ2xhc3MoJ21kLWZvY3VzZWQgbWQtZm9jdXNlZC1vcGFjaXR5Jyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gc2V0VGFiaW5kZXgoYW5ndWxhci5lbGVtZW50KCQodGhpcylbMF0pLCAwKTtcclxuICAgICAgICAgICAgfSkub24oJ2ZvY3Vzb3V0JywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBldmVudC5jdXJyZW50VGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgaWYgKCEkKHRhcmdldCkuaGFzQ2xhc3MoJ21kLWZvY3VzZWQnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1mb2N1c2VkLWNvbnRhaW5lcicpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy4kc2NvcGUucGlwRm9jdXNlZE9wYWNpdHkgfHwgIXRoaXMuJHNjb3BlLnBpcEZvY3VzZWRPcGFjaXR5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAkKHRoaXMpLmNzcygnYmFja2dyb3VuZENvbG9yJywgX2NvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCBcIlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQgbWQtZm9jdXNlZC1vcGFjaXR5Jyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5yZW1vdmVDbGFzcygnbWQtZm9jdXNlZCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gSWYgSSBnbyBmcm9tIGJsb2NrIGFsbCBlbGVtZW50IGhhdmUgdGFiaW5kZXggPSAtMVxyXG4gICAgICAgICAgICAgICAgLy8gc2V0VGFiaW5kZXgoYW5ndWxhci5lbGVtZW50KCQodGhpcylbMF0pLCAtMSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSByZ2JhKGNvbG9yKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiRzY29wZS5waXBGb2N1c2VkQ29sb3IgJiYgdGhpcy4kc2NvcGUucGlwRm9jdXNlZENvbG9yKCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRzY29wZS5waXBGb2N1c2VkQ29sb3IoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIGFyciA9IGNvbG9yLnNwbGl0KFwiKFwiKVsxXS5zcGxpdChcIilcIilbMF0uc3BsaXQoXCIsXCIpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFhcnIgfHwgYXJyLmxlbmd0aCA8IDMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnJ1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcmVkLCBibHVlLCBncmVlbiwgb3BhY2l0eTtcclxuXHJcbiAgICAgICAgICAgIG9wYWNpdHkgPSBhcnIubGVuZ3RoID09IDMgPyAxIDogcGFyc2VGbG9hdChhcnJbM10pO1xyXG4gICAgICAgICAgICByZWQgPSBhcnJbMF07XHJcbiAgICAgICAgICAgIGJsdWUgPSBhcnJbMV07XHJcbiAgICAgICAgICAgIGdyZWVuID0gYXJyWzJdO1xyXG5cclxuICAgICAgICAgICAgaWYgKG9wYWNpdHkgPCB0aGlzLm9wYWNpdHlMaW1pdCkge1xyXG4gICAgICAgICAgICAgICAgb3BhY2l0eSArPSB0aGlzLm9wYWNpdHlEZWx0YTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG9wYWNpdHkgLT0gdGhpcy5vcGFjaXR5RGVsdGE7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiAncmdiYSgnICsgcmVkICsgJywgJyArIGJsdWUgKyAnLCAnICsgZ3JlZW4gKyAnLCAnICsgb3BhY2l0eSArICcpJztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgc2V0VGFiaW5kZXgoZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIHZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY2hlY2tUYWJpbmRleChjb250cm9scykge1xyXG4gICAgICAgICAgICBsZXQgaW5kZXggPSBfLmZpbmRJbmRleChjb250cm9scywgKGMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjWyd0YWJpbmRleCddID4gLTE7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ID09IC0xICYmIGNvbnRyb2xzLmxlbmd0aCA+IDAgJiYgdGhpcy4kc2NvcGUucGlwRm9jdXNlZFRhYmluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBsZXQgZWwgPSBjb250cm9sc1swXTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0VGFiaW5kZXgoYW5ndWxhci5lbGVtZW50KGNvbnRyb2xzWzBdKSwgdGhpcy4kc2NvcGUucGlwRm9jdXNlZFRhYmluZGV4KCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGtleWRvd25MaXN0ZW5lcihlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleUNvZGUgPSBlLndoaWNoIHx8IGUua2V5Q29kZTtcclxuICAgICAgICAgICAgLy8gQ2hlY2sgY29udHJvbCBrZXlDb2RlXHJcbiAgICAgICAgICAgIGlmIChrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuTEVGVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0XHJcbiAgICAgICAgICAgICAgICAgICAgaW5jcmVtZW50ID0gKGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fCBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykgPyAxIDogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgbW92ZVRvQ29udHJvbCA9IHRoaXMuY29udHJvbHMuaW5kZXgodGhpcy5jb250cm9scy5maWx0ZXIoXCIubWQtZm9jdXNlZFwiKSkgKyBpbmNyZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAvLyBNb3ZlIGZvY3VzIHRvIG5leHQgY29udHJvbFxyXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVUb0NvbnRyb2wgPj0gMCAmJiBtb3ZlVG9Db250cm9sIDwgdGhpcy5jb250cm9sc0xlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29udHJvbHNbbW92ZVRvQ29udHJvbF0uZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBGb2N1c2VkID0gZnVuY3Rpb24gKCR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsIFxyXG4gICAgICAgICRtZENvbnN0YW50OiBhbnksIFxyXG4gICAgICAgICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlXHJcbiAgICApOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgcGlwRm9jdXNlZENvbG9yOiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwRm9jdXNlZFJlYmluZDogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRUYWJpbmRleDogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRPcGFjaXR5OiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwRm9jdXNlZERhdGE6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBXaXRoSGlkZGVuOiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwUmViaW5kOiAnJj8nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZTogRm9jdXNlZFNjb3BlLCAkZWxlbWVudDogSlF1ZXJ5LCAkYXR0cnM6IEZvY3VzZWRBdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgRm9jdXNlZExpbmsoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCAkdGltZW91dCwgJG1kQ29uc3RhbnQsICR3aW5kb3cpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKFwicGlwRm9jdXNlZFwiLCBbXSlcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBGb2N1c2VkJywgRm9jdXNlZCk7XHJcbn0iLCLvu79hbmd1bGFyLm1vZHVsZSgncGlwQmVoYXZpb3JzJywgW1xyXG4gICAgJ3BpcEZvY3VzZWQnLFxyXG4gICAgJ3BpcFNlbGVjdGVkJyxcclxuICAgICdwaXBJbmZpbml0ZVNjcm9sbCcsXHJcbiAgICAncGlwVW5zYXZlZENoYW5nZXMnLFxyXG4gICAgJ3BpcERyYWdnYWJsZScsXHJcbiAgICAncGlwU2hvcnRjdXRzJ1xyXG5dKTsiLCJ7XHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwSW5maW5pdGVTY3JvbGxcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBJbmZpbml0ZVNjcm9sbCcsIFxyXG4gICAgICAgIGZ1bmN0aW9uKCRyb290U2NvcGUsICR3aW5kb3csICRpbnRlcnZhbCwgJHBhcnNlKSB7XHJcbiAgICAgICAgICAgIHZhciBUSFJPVFRMRV9NSUxMSVNFQ09ORFMgPSA1MDA7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgICAgICBwaXBJbmZpbml0ZVNjcm9sbDogJyYnLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbENvbnRhaW5lcjogJz0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbERpc3RhbmNlOiAnPScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwU2Nyb2xsRGlzYWJsZWQ6ICc9JyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbTogJz0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbExpc3RlbkZvckV2ZW50OiAnQCdcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGU6IGFueSwgJGVsZW1lbnQsICRhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja1doZW5FbmFibGVkID0gbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbW1lZGlhdGVDaGVjayA9IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbERpc3RhbmNlID0gbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRW5hYmxlZCA9IG51bGwsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lciA9IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZURvY3VtZW50Qm90dG9tID0gZmFsc2UsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3dFbGVtZW50ID0gYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhlaWdodChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50WzBdIHx8IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hTihlbGVtZW50Lm9mZnNldEhlaWdodCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvZmZzZXRUb3AoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0IHx8IGVsZW1lbnQuY3NzKCdub25lJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgKyBwYWdlWU9mZnNldChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBwYWdlWU9mZnNldChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50WzBdIHx8IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hTih3aW5kb3cucGFnZVlPZmZzZXQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkNvbnRhaW5lclNjcm9sbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20sIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyVG9wT2Zmc2V0LCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20sIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtYWluaW5nLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZFNjcm9sbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxDb250YWluZXIgPT09IHdpbmRvd0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IGhlaWdodChzY3JvbGxDb250YWluZXIpICsgcGFnZVlPZmZzZXQoc2Nyb2xsQ29udGFpbmVyWzBdLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gb2Zmc2V0VG9wKCRlbGVtZW50KSArIGhlaWdodCgkZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBoZWlnaHQoc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2Zmc2V0VG9wKHNjcm9sbENvbnRhaW5lcikgIT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCA9IG9mZnNldFRvcChzY3JvbGxDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSA9IG9mZnNldFRvcCgkZWxlbWVudCkgLSBjb250YWluZXJUb3BPZmZzZXQgKyBoZWlnaHQoJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodXNlRG9jdW1lbnRCb3R0b20pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSBoZWlnaHQoKCRlbGVtZW50WzBdLm93bmVyRG9jdW1lbnQgfHwgKDxhbnk+JGVsZW1lbnRbMF0pLmRvY3VtZW50KS5kb2N1bWVudEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1haW5pbmcgPSBlbGVtZW50Qm90dG9tIC0gY29udGFpbmVyQm90dG9tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRTY3JvbGwgPSByZW1haW5pbmcgPD0gaGVpZ2h0KHNjcm9sbENvbnRhaW5lcikgKiBzY3JvbGxEaXN0YW5jZSArIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2hvdWxkU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1doZW5FbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxFbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS4kJHBoYXNlIHx8ICRyb290U2NvcGUuJCRwaGFzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnBpcEluZmluaXRlU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS4kYXBwbHkoJHNjb3BlLnBpcEluZmluaXRlU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hlY2tXaGVuRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFRIUk9UVExFX01JTExJU0VDT05EUyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ29udGFpbmVyU2Nyb2xsID0gXy50aHJvdHRsZShvbkNvbnRhaW5lclNjcm9sbCwgVEhST1RUTEVfTUlMTElTRUNPTkRTKTsgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyLnVuYmluZCgnc2Nyb2xsJywgb25Db250YWluZXJTY3JvbGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaGFuZGxlU2Nyb2xsRGlzdGFuY2Uodikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2Nyb2xsRGlzdGFuY2UgPSBwYXJzZUZsb2F0KHYpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBTY3JvbGxEaXN0YW5jZScsIGhhbmRsZVNjcm9sbERpc3RhbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY3JvbGxEaXN0YW5jZSgkc2NvcGUucGlwU2Nyb2xsRGlzdGFuY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbERpc2FibGVkKHYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRW5hYmxlZCA9ICF2O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsRW5hYmxlZCAmJiBjaGVja1doZW5FbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1doZW5FbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb25Db250YWluZXJTY3JvbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsRGlzYWJsZWQnLCBoYW5kbGVTY3JvbGxEaXNhYmxlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsRGlzYWJsZWQoJHNjb3BlLnBpcFNjcm9sbERpc2FibGVkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20odikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlRG9jdW1lbnRCb3R0b20gPSB2O1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20nLCBoYW5kbGVTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20oJHNjb3BlLnBpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hhbmdlQ29udGFpbmVyKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsQ29udGFpbmVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci51bmJpbmQoJ3Njcm9sbCcsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gbmV3Q29udGFpbmVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzY3JvbGxDb250YWluZXIuYmluZCgnc2Nyb2xsJywgb25Db250YWluZXJTY3JvbGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ29udGFpbmVyKHdpbmRvd0VsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbigkc2NvcGUucGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbENvbnRhaW5lcihuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChuZXdDb250YWluZXIgPT0gbnVsbCkgfHwgbmV3Q29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld0NvbnRhaW5lci5hcHBlbmQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChuZXdDb250YWluZXJbbmV3Q29udGFpbmVyLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbmV3Q29udGFpbmVyID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29udGFpbmVyID0gJGVsZW1lbnQucGFyZW50cygpLmZpbmQobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPSBudWxsICYmICghQXJyYXkuaXNBcnJheShuZXdDb250YWluZXIpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoQXJyYXkuaXNBcnJheShuZXdDb250YWluZXIpICYmIG5ld0NvbnRhaW5lci5sZW5ndGggPiAwKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGFuZ2VDb250YWluZXIobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcGlwLXNjcm9sbC1jb250YWluZXIgYXR0cmlidXRlLlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsQ29udGFpbmVyJywgZnVuY3Rpb24gKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyICE9PSBzY3JvbGxDb250YWluZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY3JvbGxDb250YWluZXIobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY3JvbGxDb250YWluZXIoJHNjb3BlLnBpcFNjcm9sbENvbnRhaW5lciB8fCBbXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRhdHRycy5waXBTY3JvbGxQYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VDb250YWluZXIoYW5ndWxhci5lbGVtZW50KCRlbGVtZW50LnBhcmVudCgpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkYXR0cnMucGlwU2Nyb2xJbW1lZGlhdGVDaGVjayAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltbWVkaWF0ZUNoZWNrID0gJHNjb3BlLiRldmFsKCRhdHRycy5waXBTY3JvbEltbWVkaWF0ZUNoZWNrKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRpbnRlcnZhbCgoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbW1lZGlhdGVDaGVjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9uQ29udGFpbmVyU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KSwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICApO1xyXG59XHJcblxyXG4iLCJleHBvcnQgY2xhc3MgU2hvcnRjdXRPcHRpb24ge1xyXG4gICAgVHlwZTogS2V5Ym9hcmRFdmVudDtcclxuICAgIFByb3BhZ2F0ZTogYm9vbGVhbjtcclxuICAgIERpc2FibGVJbklucHV0OiBib29sZWFuO1xyXG4gICAgVGFyZ2V0OiBhbnk7IC8vIEV2ZW50IHRhcmdldCBvYmplY3RcclxuICAgIEtleWNvZGU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEtleWJvYXJkRXZlbnQge1xyXG4gICAgc3RhdGljIEtleWRvd246IHN0cmluZyA9ICdrZXlkb3duJztcclxuICAgIHN0YXRpYyBLZXl1cDogc3RyaW5nID0gJ2tleXVwJztcclxuICAgIHN0YXRpYyBLZXlwcmVzczogc3RyaW5nID0gJ2tleXByZXNzJztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEtleWJvYXJkU2hvcnRjdXQge1xyXG4gICAgcHJpdmF0ZSBzaGlmdF9udW1zID0ge1xyXG4gICAgICAgIFwiYFwiOiBcIn5cIixcclxuICAgICAgICBcIjFcIjogXCIhXCIsXHJcbiAgICAgICAgXCIyXCI6IFwiQFwiLFxyXG4gICAgICAgIFwiM1wiOiBcIiNcIixcclxuICAgICAgICBcIjRcIjogXCIkXCIsXHJcbiAgICAgICAgXCI1XCI6IFwiJVwiLFxyXG4gICAgICAgIFwiNlwiOiBcIl5cIixcclxuICAgICAgICBcIjdcIjogXCImXCIsXHJcbiAgICAgICAgXCI4XCI6IFwiKlwiLFxyXG4gICAgICAgIFwiOVwiOiBcIihcIixcclxuICAgICAgICBcIjBcIjogXCIpXCIsXHJcbiAgICAgICAgXCItXCI6IFwiX1wiLFxyXG4gICAgICAgIFwiPVwiOiBcIitcIixcclxuICAgICAgICBcIjtcIjogXCI6XCIsXHJcbiAgICAgICAgXCInXCI6IFwiXFxcIlwiLFxyXG4gICAgICAgIFwiLFwiOiBcIjxcIixcclxuICAgICAgICBcIi5cIjogXCI+XCIsXHJcbiAgICAgICAgXCIvXCI6IFwiP1wiLFxyXG4gICAgICAgIFwiXFxcXFwiOiBcInxcIlxyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIHNwZWNpYWxfa2V5cyA9IHtcclxuICAgICAgICAnZXNjJzogMjcsXHJcbiAgICAgICAgJ2VzY2FwZSc6IDI3LFxyXG4gICAgICAgICd0YWInOiA5LFxyXG4gICAgICAgICdzcGFjZSc6IDMyLFxyXG4gICAgICAgICdyZXR1cm4nOiAxMyxcclxuICAgICAgICAnZW50ZXInOiAxMyxcclxuICAgICAgICAnYmFja3NwYWNlJzogOCxcclxuXHJcbiAgICAgICAgJ3Njcm9sbGxvY2snOiAxNDUsXHJcbiAgICAgICAgJ3Njcm9sbF9sb2NrJzogMTQ1LFxyXG4gICAgICAgICdzY3JvbGwnOiAxNDUsXHJcbiAgICAgICAgJ2NhcHNsb2NrJzogMjAsXHJcbiAgICAgICAgJ2NhcHNfbG9jayc6IDIwLFxyXG4gICAgICAgICdjYXBzJzogMjAsXHJcbiAgICAgICAgJ251bWxvY2snOiAxNDQsXHJcbiAgICAgICAgJ251bV9sb2NrJzogMTQ0LFxyXG4gICAgICAgICdudW0nOiAxNDQsXHJcblxyXG4gICAgICAgICdwYXVzZSc6IDE5LFxyXG4gICAgICAgICdicmVhayc6IDE5LFxyXG5cclxuICAgICAgICAnaW5zZXJ0JzogNDUsXHJcbiAgICAgICAgJ2hvbWUnOiAzNixcclxuICAgICAgICAnZGVsZXRlJzogNDYsXHJcbiAgICAgICAgJ2VuZCc6IDM1LFxyXG5cclxuICAgICAgICAncGFnZXVwJzogMzMsXHJcbiAgICAgICAgJ3BhZ2VfdXAnOiAzMyxcclxuICAgICAgICAncHUnOiAzMyxcclxuXHJcbiAgICAgICAgJ3BhZ2Vkb3duJzogMzQsXHJcbiAgICAgICAgJ3BhZ2VfZG93bic6IDM0LFxyXG4gICAgICAgICdwZCc6IDM0LFxyXG5cclxuICAgICAgICAnbGVmdCc6IDM3LFxyXG4gICAgICAgICd1cCc6IDM4LFxyXG4gICAgICAgICdyaWdodCc6IDM5LFxyXG4gICAgICAgICdkb3duJzogNDAsXHJcblxyXG4gICAgICAgICdmMSc6IDExMixcclxuICAgICAgICAnZjInOiAxMTMsXHJcbiAgICAgICAgJ2YzJzogMTE0LFxyXG4gICAgICAgICdmNCc6IDExNSxcclxuICAgICAgICAnZjUnOiAxMTYsXHJcbiAgICAgICAgJ2Y2JzogMTE3LFxyXG4gICAgICAgICdmNyc6IDExOCxcclxuICAgICAgICAnZjgnOiAxMTksXHJcbiAgICAgICAgJ2Y5JzogMTIwLFxyXG4gICAgICAgICdmMTAnOiAxMjEsXHJcbiAgICAgICAgJ2YxMSc6IDEyMixcclxuICAgICAgICAnZjEyJzogMTIzXHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgbW9kaWZpZXJzID0ge1xyXG4gICAgICAgIHNoaWZ0OiB7IHdhbnRlZDogZmFsc2UsIHByZXNzZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgY3RybDogeyB3YW50ZWQ6IGZhbHNlLCBwcmVzc2VkOiBmYWxzZSB9LFxyXG4gICAgICAgIGFsdDogeyB3YW50ZWQ6IGZhbHNlLCBwcmVzc2VkOiBmYWxzZSB9LFxyXG4gICAgICAgIG1ldGE6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfVx0Ly8gTWV0YSBpcyBNYWMgc3BlY2lmaWNcclxuICAgIH07XHJcblxyXG4gICAgcHVibGljIGV2ZW50Q2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG4gICAgcHVibGljIHRhcmdldDogYW55O1xyXG4gICAgcHVibGljIGV2ZW50OiBLZXlib2FyZEV2ZW50O1xyXG4gICAgcHVibGljIG9wdGlvbjogU2hvcnRjdXRPcHRpb247XHJcbiAgICBwdWJsaWMgc2hvcmN1dDogc3RyaW5nO1xyXG4gICAgcHVibGljIGNhbGxiYWNrOiBGdW5jdGlvbjtcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3IoXHJcbiAgICAgICAgZWxlbWVudDogYW55LFxyXG4gICAgICAgIHNob3JjdXRDb21iaW5hdGlvbjogc3RyaW5nLFxyXG4gICAgICAgIG9wdGlvbjogU2hvcnRjdXRPcHRpb24sXHJcbiAgICAgICAgY2FsbGJhY2s6IChlPzogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWRcclxuICAgICkge1xyXG4gICAgICAgIFwibmdJbmplY3RcIjtcclxuXHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBlbGVtZW50O1xyXG4gICAgICAgIHRoaXMuc2hvcmN1dCA9IHNob3JjdXRDb21iaW5hdGlvbjtcclxuICAgICAgICB0aGlzLmV2ZW50ID0gb3B0aW9uLlR5cGU7XHJcbiAgICAgICAgdGhpcy5vcHRpb24gPSBvcHRpb247XHJcbiAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cclxuICAgICAgICB0aGlzLmV2ZW50Q2FsbGJhY2sgPSAoZXZlbnQ6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBlOiBKUXVlcnlFdmVudE9iamVjdCA9IGV2ZW50IHx8IDxKUXVlcnlFdmVudE9iamVjdD53aW5kb3cuZXZlbnQ7XHJcbiAgICAgICAgICAgIGxldCBjb2RlOiBudW1iZXI7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb24uRGlzYWJsZUluSW5wdXQpIHsgLy8gRGlzYWJsZSBzaG9ydGN1dCBrZXlzIGluIElucHV0LCBUZXh0YXJlYSBmaWVsZHNcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGUudGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlLnNyY0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZS5zcmNFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50Lm5vZGVUeXBlID09IDMpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQudGFnTmFtZSA9PSAnSU5QVVQnIHx8IGVsZW1lbnQudGFnTmFtZSA9PSAnVEVYVEFSRUEnKSByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gRmluZCBXaGljaCBrZXkgaXMgcHJlc3NlZFxyXG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gZS5rZXlDb2RlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUud2hpY2gpIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBlLndoaWNoO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgY2hhcmFjdGVyID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvZGUgPT0gMTg4KSBjaGFyYWN0ZXIgPSBcIixcIjsgLy8gSWYgdGhlIHVzZXIgcHJlc3Nlcywgd2hlbiB0aGUgdHlwZSBpcyBvbmtleWRvd25cclxuICAgICAgICAgICAgaWYgKGNvZGUgPT0gMTkwKSBjaGFyYWN0ZXIgPSBcIi5cIjsgLy8gSWYgdGhlIHVzZXIgcHJlc3Nlcywgd2hlbiB0aGUgdHlwZSBpcyBvbmtleWRvd25cclxuXHJcbiAgICAgICAgICAgIGxldCBrZXlzOiBzdHJpbmdbXSA9IHRoaXMuc2hvcmN1dC5zcGxpdChcIitcIik7XHJcbiAgICAgICAgICAgIC8vIEtleSBQcmVzc2VkIC0gY291bnRzIHRoZSBudW1iZXIgb2YgdmFsaWQga2V5cHJlc3NlcyAtIGlmIGl0IGlzIHNhbWUgYXMgdGhlIG51bWJlciBvZiBrZXlzLCB0aGUgc2hvcnRjdXQgZnVuY3Rpb24gaXMgaW52b2tlZFxyXG4gICAgICAgICAgICBsZXQga3A6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgICAgICBpZiAoZS5jdHJsS2V5KSB0aGlzLm1vZGlmaWVycy5jdHJsLnByZXNzZWQgPSBlLmN0cmxLZXk7XHJcbiAgICAgICAgICAgIGlmIChlLnNoaWZ0S2V5KSB0aGlzLm1vZGlmaWVycy5zaGlmdC5wcmVzc2VkID0gZS5zaGlmdEtleTtcclxuICAgICAgICAgICAgaWYgKGUuYWx0S2V5KSB0aGlzLm1vZGlmaWVycy5hbHQucHJlc3NlZCA9IGUuYWx0S2V5O1xyXG4gICAgICAgICAgICBpZiAoZS5tZXRhS2V5KSB0aGlzLm1vZGlmaWVycy5tZXRhLnByZXNzZWQgPSBlLm1ldGFLZXk7XHJcblxyXG4gICAgICAgICAgICBsZXQgaTogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBrOiBzdHJpbmcgPSBrZXlzW2ldO1xyXG4gICAgICAgICAgICAgICAgLy8gTW9kaWZpZXJzXHJcbiAgICAgICAgICAgICAgICBpZiAoayA9PSAnY3RybCcgfHwgayA9PSAnY29udHJvbCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmN0cmwud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoayA9PSAnc2hpZnQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5zaGlmdC53YW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrID09ICdhbHQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5hbHQud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoayA9PSAnbWV0YScpIHtcclxuICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLm1ldGEud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoay5sZW5ndGggPiAxKSB7IC8vIElmIGl0IGlzIGEgc3BlY2lhbCBrZXlcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zcGVjaWFsX2tleXNba10gPT0gY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb24uS2V5Y29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbi5LZXljb2RlID09IGNvZGUpIGtwKys7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyBUaGUgc3BlY2lhbCBrZXlzIGRpZCBub3QgbWF0Y2hcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhcmFjdGVyID09IGspIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNoaWZ0X251bXNbY2hhcmFjdGVyXSAmJiBlLnNoaWZ0S2V5KSB7IC8vIFN0dXBpZCBTaGlmdCBrZXkgYnVnIGNyZWF0ZWQgYnkgdXNpbmcgbG93ZXJjYXNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFyYWN0ZXIgPSB0aGlzLnNoaWZ0X251bXNbY2hhcmFjdGVyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGFyYWN0ZXIgPT0gaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChrcCA9PSBrZXlzLmxlbmd0aCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuY3RybC5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLmN0cmwud2FudGVkICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5zaGlmdC5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLnNoaWZ0LndhbnRlZCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuYWx0LnByZXNzZWQgPT0gdGhpcy5tb2RpZmllcnMuYWx0LndhbnRlZCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMubWV0YS5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLm1ldGEud2FudGVkKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMub3B0aW9uLlByb3BhZ2F0ZSkgeyAvLyBTdG9wIHRoZSBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGUuY2FuY2VsQnViYmxlIGlzIHN1cHBvcnRlZCBieSBJRSAtIHRoaXMgd2lsbCBraWxsIHRoZSBidWJibGluZyBwcm9jZXNzLlxyXG4gICAgICAgICAgICAgICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBlLnJldHVyblZhbHVlID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGUuc3RvcFByb3BhZ2F0aW9uIHdvcmtzIGluIEZpcmVmb3guXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5jdHJsLnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuc2hpZnQucHJlc3NlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5hbHQucHJlc3NlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5tZXRhLnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7XHJcbiAgICBLZXlib2FyZFNob3J0Y3V0LFxyXG4gICAgU2hvcnRjdXRPcHRpb24sXHJcbiAgICBLZXlib2FyZEV2ZW50XHJcbn0gZnJvbSBcIi4vS2V5Ym9hcmRTaG9ydGN1dFwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJS2V5Ym9hcmRTaG9ydGN1dHMge1xyXG4gICAgW2tleTogc3RyaW5nXTogS2V5Ym9hcmRTaG9ydGN1dFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2Uge1xyXG4gICAgYWRkKHNob3JjdXROYW1lOiBzdHJpbmcsIGNhbGxiYWNrOiAoKSA9PiB2b2lkLCBvcHRpb25zOiBTaG9ydGN1dE9wdGlvbik6IHZvaWQ7XHJcbiAgICByZW1vdmUoc2hvcmN1dE5hbWU6IHN0cmluZyk6IHZvaWQ7XHJcblxyXG4gICAgc2hvcmN1dHM6IElLZXlib2FyZFNob3J0Y3V0c1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElTaG9ydGN1dHNSZWdpc3RlclByb3ZpZGVyIGV4dGVuZHMgbmcuSVNlcnZpY2VQcm92aWRlciB7XHJcbiAgICBvcHRpb246IFNob3J0Y3V0T3B0aW9uO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlIGltcGxlbWVudHMgSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZSB7XHJcbiAgICBwcml2YXRlIF9sb2c6IG5nLklMb2dTZXJ2aWNlO1xyXG4gICAgcHJpdmF0ZSBfZGVmYXVsdE9wdGlvbjogU2hvcnRjdXRPcHRpb247XHJcbiAgICBwcml2YXRlIF9zaG9ydGN1dHM6IElLZXlib2FyZFNob3J0Y3V0cztcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3IoXHJcbiAgICAgICAgJGxvZzogbmcuSUxvZ1NlcnZpY2UsXHJcbiAgICAgICAgb3B0aW9uOiBTaG9ydGN1dE9wdGlvblxyXG4gICAgKSB7XHJcbiAgICAgICAgXCJuZ0luamVjdFwiO1xyXG4gICAgICAgIHRoaXMuX2xvZyA9ICRsb2c7XHJcbiAgICAgICAgdGhpcy5fZGVmYXVsdE9wdGlvbiA9IG9wdGlvbiA/IF8uZGVmYXVsdHMob3B0aW9uLCB0aGlzLmdldERlZmF1bHRPcHRpb24oKSkgOiB0aGlzLmdldERlZmF1bHRPcHRpb24oKTtcclxuXHJcbiAgICAgICAgdGhpcy5fc2hvcnRjdXRzID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXREZWZhdWx0T3B0aW9uKCk6IFNob3J0Y3V0T3B0aW9uIHtcclxuICAgICAgICBsZXQgZGVmYXVsdE9wdGlvbjogU2hvcnRjdXRPcHRpb24gPSB7XHJcbiAgICAgICAgICAgIFR5cGU6IEtleWJvYXJkRXZlbnQuS2V5ZG93bixcclxuICAgICAgICAgICAgUHJvcGFnYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgRGlzYWJsZUluSW5wdXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBUYXJnZXQ6IGRvY3VtZW50LFxyXG4gICAgICAgICAgICBLZXljb2RlOiBudWxsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRPcHRpb247XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjaGVja0FkZFNob3J0Y3V0KGVsZW1lbnQ6IGFueSwgc2hvcmN1dENvbWJpbmF0aW9uOiBzdHJpbmcsIGNhbGxiYWNrOiAoZTogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWQpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAoIWVsZW1lbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5fbG9nLmVycm9yKCdSZWdpc3RlciBzaG9ydGN1dDogZWxlbWVudCB1bmRlbnRpZmllZCEnKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghc2hvcmN1dENvbWJpbmF0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvZy5lcnJvcignUmVnaXN0ZXIgc2hvcnRjdXQ6IHNob3JjdXQgY29tYmluYXRpb24gdW5kZW50aWZpZWQhJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvZy5lcnJvcignUmVnaXN0ZXIgc2hvcnRjdXQ6IHNob3JjdXQgY2FsbGJhY2sgdW5kZW50aWZpZWQhJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IHNob3JjdXRzKCk6IElLZXlib2FyZFNob3J0Y3V0cyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Nob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYWRkKHNob3JjdXROYW1lOiBzdHJpbmcsIGNhbGxiYWNrOiAoZTogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWQsIG9wdGlvbjogU2hvcnRjdXRPcHRpb24pOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnJlbW92ZShzaG9yY3V0TmFtZSk7XHJcbiAgICAgICAgbGV0IHNob3JjdXRPcHRpb246IFNob3J0Y3V0T3B0aW9uID0gb3B0aW9uID8gXy5kZWZhdWx0cyhvcHRpb24sIHRoaXMuX2RlZmF1bHRPcHRpb24pIDogdGhpcy5fZGVmYXVsdE9wdGlvbjtcclxuICAgICAgICBsZXQgc2hvcmN1dENvbWJpbmF0aW9uOiBzdHJpbmcgPSBzaG9yY3V0TmFtZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgIGxldCBlbGVtZW50ID0gc2hvcmN1dE9wdGlvbi5UYXJnZXQ7XHJcblxyXG5cclxuICAgICAgICBpZiAodHlwZW9mIHNob3JjdXRPcHRpb24uVGFyZ2V0ID09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzaG9yY3V0T3B0aW9uLlRhcmdldCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZWxlbWVudCA9IHNob3JjdXRPcHRpb24uVGFyZ2V0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLmNoZWNrQWRkU2hvcnRjdXQoZWxlbWVudCwgc2hvcmN1dENvbWJpbmF0aW9uLCBjYWxsYmFjaykpIHtcclxuXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG5ld0tleWJvYXJkU2hvcnRjdXQgPSBuZXcgS2V5Ym9hcmRTaG9ydGN1dChlbGVtZW50LCBzaG9yY3V0Q29tYmluYXRpb24sIHNob3JjdXRPcHRpb24sIGNhbGxiYWNrKTtcclxuXHJcbiAgICAgICAgdGhpcy5fc2hvcnRjdXRzW3Nob3JjdXRDb21iaW5hdGlvbl0gPSBuZXdLZXlib2FyZFNob3J0Y3V0O1xyXG5cclxuICAgICAgICAvL0F0dGFjaCB0aGUgZnVuY3Rpb24gd2l0aCB0aGUgZXZlbnRcclxuICAgICAgICBpZiAoZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihzaG9yY3V0T3B0aW9uLlR5cGUsIG5ld0tleWJvYXJkU2hvcnRjdXQuZXZlbnRDYWxsYmFjaywgZmFsc2UpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5hdHRhY2hFdmVudCkge1xyXG4gICAgICAgICAgICBlbGVtZW50LmF0dGFjaEV2ZW50KCdvbicgKyBzaG9yY3V0T3B0aW9uLlR5cGUsIG5ld0tleWJvYXJkU2hvcnRjdXQuZXZlbnRDYWxsYmFjayk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZWxlbWVudC5vbihzaG9yY3V0T3B0aW9uLlR5cGUsIG5ld0tleWJvYXJkU2hvcnRjdXQuZXZlbnRDYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyByZW1vdmUoc2hvcmN1dE5hbWU6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGxldCBzaG9ydGN1dENvbWJpbmF0aW9uID0gc2hvcmN1dE5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICBsZXQgYmluZGluZzogS2V5Ym9hcmRTaG9ydGN1dCA9IHRoaXMuX3Nob3J0Y3V0c1tzaG9ydGN1dENvbWJpbmF0aW9uXTtcclxuXHJcbiAgICAgICAgZGVsZXRlKHRoaXMuX3Nob3J0Y3V0c1tzaG9ydGN1dENvbWJpbmF0aW9uXSlcclxuICAgICAgICBpZiAoIWJpbmRpbmcpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IHR5cGUgPSBiaW5kaW5nLmV2ZW50O1xyXG4gICAgICAgIGxldCBlbGVtZW50ID0gYmluZGluZy50YXJnZXQ7XHJcbiAgICAgICAgbGV0IGNhbGxiYWNrID0gYmluZGluZy5ldmVudENhbGxiYWNrO1xyXG5cclxuICAgICAgICBpZiAoZWxlbWVudC5kZXRhY2hFdmVudCkge1xyXG4gICAgICAgICAgICBlbGVtZW50LmRldGFjaEV2ZW50KCdvbicgKyB0eXBlLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrLCBmYWxzZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gZWxlbWVudFsnb24nICsgdHlwZV0gPSBmYWxzZTtcclxuICAgICAgICAgICAgZWxlbWVudC5vZmYodHlwZSwgY2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxue1xyXG4gICAgY2xhc3MgU2hvcnRjdXRzUmVnaXN0ZXJQcm92aWRlciBpbXBsZW1lbnRzIElTaG9ydGN1dHNSZWdpc3RlclByb3ZpZGVyIHtcclxuICAgICAgICBwcml2YXRlIF9zZXJ2aWNlOiBTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2U7XHJcbiAgICAgICAgcHJpdmF0ZSBfb3B0aW9uOiBTaG9ydGN1dE9wdGlvbjtcclxuXHJcbiAgICAgICAgcHVibGljIGdldCBvcHRpb24oKTogU2hvcnRjdXRPcHRpb24ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb3B0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldCBvcHRpb24odmFsdWU6IFNob3J0Y3V0T3B0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX29wdGlvbiA9IHZhbHVlIHx8IG5ldyBTaG9ydGN1dE9wdGlvbigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljICRnZXQoXHJcbiAgICAgICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIFwibmdJbmplY3RcIjtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9zZXJ2aWNlID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXJ2aWNlID0gbmV3IFNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZSgkbG9nLCB0aGlzLl9vcHRpb24pO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NlcnZpY2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgICAgIC5wcm92aWRlcigncGlwU2hvcnRjdXRzUmVnaXN0ZXInLCBTaG9ydGN1dHNSZWdpc3RlclByb3ZpZGVyKTtcclxufSIsImltcG9ydCAge1xyXG4gICAgU2hvcnRjdXRPcHRpb24sXHJcbn0gZnJvbSBcIi4vS2V5Ym9hcmRTaG9ydGN1dFwiO1xyXG5cclxuaW1wb3J0ICB7XHJcbiAgICBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlLFxyXG59IGZyb20gXCIuL1Nob3JjdXRzUmVnaXN0ZXJTZXJ2aWNlXCI7XHJcblxyXG5pbnRlcmZhY2UgU2hvcnRjdXRBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgcGlwU2hvcnRjdXRBY3Rpb246IGFueTtcclxuICAgIHBpcFNob3J0Y3V0TmFtZTogYW55O1xyXG4gICAgcGlwU2hvcmN1dE9wdGlvbnM6IFNob3J0Y3V0T3B0aW9uO1xyXG59XHJcblxyXG5jbGFzcyBTaG9ydGN1dENvbnRyb2xsZXIgaW1wbGVtZW50cyBuZy5JQ29udHJvbGxlciAge1xyXG4gICAgcHJpdmF0ZSBhY3Rpb25TaG9ydGN1dHM6IEZ1bmN0aW9uO1xyXG4gICAgcHJpdmF0ZSBuYW1lU2hvcnRjdXRzOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIG9wdGlvbnM6IFNob3J0Y3V0T3B0aW9uO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgJGF0dHJzOiBTaG9ydGN1dEF0dHJpYnV0ZXMsXHJcbiAgICAgICAgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICAgICAgJGxvZzogbmcuSUxvZ1NlcnZpY2UsXHJcbiAgICAgICAgJHBhcnNlOiBuZy5JUGFyc2VTZXJ2aWNlLFxyXG4gICAgICAgIHBpcFNob3J0Y3V0c1JlZ2lzdGVyOiBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgIGlmICgkYXR0cnMucGlwU2hvcnRjdXRBY3Rpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMgPSAkcGFyc2UoJGF0dHJzLnBpcFNob3J0Y3V0QWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMoJHNjb3BlLCB7JGV2ZW50OiB7fX0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICRsb2cuZXJyb3IoJ1Nob3JjdW50IGFjdGlvbiBkb2VzIG5vdCBzZXQuJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICgkYXR0cnMucGlwU2hvcnRjdXROYW1lICYmIF8uaXNTdHJpbmcoJGF0dHJzLnBpcFNob3J0Y3V0TmFtZSkpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lU2hvcnRjdXRzID0gJGF0dHJzLnBpcFNob3J0Y3V0TmFtZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAkbG9nLmVycm9yKCdTaG9yY3VudCBuYW1lIGRvZXMgbm90IHNldC4nKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5vcHRpb25zID0gJGF0dHJzLnBpcFNob3JjdXRPcHRpb25zID8gPFNob3J0Y3V0T3B0aW9uPiRhdHRycy5waXBTaG9yY3V0T3B0aW9ucyA6IDxTaG9ydGN1dE9wdGlvbj57fTtcclxuICAgICAgICB0aGlzLm9wdGlvbnMuVGFyZ2V0ID0gJGVsZW1lbnQ7XHJcbiAgICAgICAgLy8gUmVnaXN0cmF0aW9uIG9mIGtleWJvcmQgc2hvcnRjdXRzXHJcbiAgICAgICAgcGlwU2hvcnRjdXRzUmVnaXN0ZXIuYWRkKHRoaXMubmFtZVNob3J0Y3V0cywgKGU/OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMoJHNjb3BlLCB7JGV2ZW50OiB7J2UnOiBlfX0pOyAgICAgICAgICBcclxuICAgICAgICB9LCB0aGlzLm9wdGlvbnMpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUga2V5cHJlc3NTaG9ydGN1dChhY3Rpb24pIHtcclxuICAgICAgICB0aGlzLmFjdGlvblNob3J0Y3V0cygpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBQcmV2ZW50IGp1bmsgZnJvbSBnb2luZyBpbnRvIHR5cGVzY3JpcHQgZGVmaW5pdGlvbnNcclxue1xyXG4gICAgY29uc3Qgc2hvcnRjdXRzRGlyZWN0aXZlID0gZnVuY3Rpb24oKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLCAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiBTaG9ydGN1dENvbnRyb2xsZXJcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcFNob3J0Y3V0Jywgc2hvcnRjdXRzRGlyZWN0aXZlKTtcclxufSIsImltcG9ydCB7XHJcbiAgICBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlXHJcbn0gZnJvbSBcIi4vU2hvcmN1dHNSZWdpc3RlclNlcnZpY2VcIlxyXG5pbXBvcnQgIHtcclxuICAgIEtleWJvYXJkU2hvcnRjdXQsXHJcbiAgICBTaG9ydGN1dE9wdGlvbixcclxuICAgIEtleWJvYXJkRXZlbnRcclxufSBmcm9tIFwiLi9LZXlib2FyZFNob3J0Y3V0XCI7XHJcblxyXG5leHBvcnQgbGV0IFNob3J0Y3V0c0NoYW5nZWRFdmVudCA9ICdwaXBTaG9ydGN1dHNDaGFuZ2VkJztcclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dEl0ZW0ge1xyXG4gICAgLy8gU2hvcnRjdXQgY29tYmluYXRpb25cclxuICAgIHB1YmxpYyBzaG9ydGN1dDogc3RyaW5nO1xyXG4gICAgLy8gVGFyZ2V0IG9iamVjdCBcclxuICAgIHB1YmxpYyB0YXJnZXQ/OiBhbnk7XHJcbiAgICAvLyBUYXJnZXQgZWxlbWVudCBieSBJZFxyXG4gICAgcHVibGljIHRhcmdldElkPzogc3RyaW5nO1xyXG4gICAgLy8gVGFyZ2V0IGVsZW1lbnQgYnkgY2xhc3MgKGZpcnN0ZWxlbWVudD8/KVxyXG4gICAgLy8gUHVibGljIHRhcmdldENsYXNzPzogc3RyaW5nO1xyXG4gICAgLy8gQWNjZXNzIGZ1bmN0aW9uXHJcbiAgICBwdWJsaWMgYWNjZXNzPzogKGV2ZW50OiBKUXVlcnlFdmVudE9iamVjdCkgPT4gYm9vbGVhbjtcclxuICAgIC8vIFdpbmRvdy5sb2NhdGlvbi5ocmVmXHJcbiAgICBwdWJsaWMgaHJlZj86IHN0cmluZztcclxuICAgIC8vICRsb2NhdGlvbi51cmxcclxuICAgIHB1YmxpYyB1cmw/OiBzdHJpbmc7XHJcbiAgICAvLyAkc3RhdGUuZ28oc3RhdGUsIHN0YXRlUGFyYW1zKVxyXG4gICAgcHVibGljIHN0YXRlPzogc3RyaW5nO1xyXG4gICAgLy8gUGFyYW1ldGVycyBmb3IgJHN0YXRlLmdvKHN0YXRlLCBzdGF0ZVBhcmFtcylcclxuICAgIHB1YmxpYyBzdGF0ZVBhcmFtcz86IGFueTtcclxuICAgIC8vICRyb290U2NvcGUuYnJvYWRjYXN0KGV2ZW50KVxyXG4gICAgcHVibGljIGV2ZW50Pzogc3RyaW5nO1xyXG4gICAgLy8gQ2xpY2sgY2FsbGJhY2tcclxuICAgIHB1YmxpYyBrZXlwcmVzcz86IChldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWQ7XHJcbiAgICAvLyBEZWZhdWx0IG9wdGlvbnNcclxuICAgIHB1YmxpYyBvcHRpb25zPzogU2hvcnRjdXRPcHRpb247ICAgIFxyXG59XHJcblxyXG4vLyBleHBvcnQgY2xhc3MgU2hvcnRjdXRJdGVtIGV4dGVuZHMgU2ltcGxlU2hvcnRjdXRJdGVtIHtcclxuLy8gICAgIHB1YmxpYyBzaG9ydGN1dHM6IFNpbXBsZVNob3J0Y3V0SXRlbVtdO1xyXG4vLyB9XHJcblxyXG5leHBvcnQgY2xhc3MgU2hvcnRjdXRzQ29uZmlnIHtcclxuICAgIC8vIEdsb2JhbCBzaG9ydGN1dCBcclxuICAgIHB1YmxpYyBnbG9iYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdID0gW107XHJcbiAgICAvLyBMb2NhbCBzaG9ydGN1dCBcclxuICAgIHB1YmxpYyBsb2NhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW10gPSBbXTtcclxuICAgIC8vIERlZmF1bHQgb3B0aW9uc1xyXG4gICAgcHVibGljIGRlZmF1bHRPcHRpb25zOiBTaG9ydGN1dE9wdGlvbiA9IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVNob3J0Y3V0c1NlcnZpY2Uge1xyXG4gICAgcmVhZG9ubHkgY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcblxyXG4gICAgZ2xvYmFsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXTtcclxuICAgIGxvY2FsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXTtcclxuXHJcbiAgICBvbihnbG9iYWxTaG9ydGN1dHM/OiBTaG9ydGN1dEl0ZW1bXSwgbG9jYWxTaG9ydGN1dHM/OiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQ7XHJcbiAgICBvbkxvY2FsKGxvY2FsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10pOiB2b2lkO1xyXG4gICAgb2ZmKCk6IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVNob3J0Y3V0c1Byb3ZpZGVyIGV4dGVuZHMgbmcuSVNlcnZpY2VQcm92aWRlciB7XHJcbiAgICBjb25maWc6IFNob3J0Y3V0c0NvbmZpZztcclxuICAgIFxyXG4gICAgZ2xvYmFsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXTtcclxuICAgIGxvY2FsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXTtcclxuICAgIGRlZmF1bHRPcHRpb25zOiBTaG9ydGN1dE9wdGlvbjtcclxufVxyXG5cclxuY2xhc3MgU2hvcnRjdXRzU2VydmljZSBpbXBsZW1lbnRzIElTaG9ydGN1dHNTZXJ2aWNlIHtcclxuICAgIHByaXZhdGUgX29sZENvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG4gICAgcHJpdmF0ZSBfY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIGNvbmZpZzogU2hvcnRjdXRzQ29uZmlnLFxyXG4gICAgICAgIHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSwgXHJcbiAgICAgICAgcHJpdmF0ZSAkbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2UsIFxyXG4gICAgICAgIHByaXZhdGUgJGluamVjdG9yOiBuZy5hdXRvLklJbmplY3RvclNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSBwaXBTaG9ydGN1dHNSZWdpc3RlcjogSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZVxyXG4gICAgKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5jb25maWc7XHJcbiAgICAgICAgdGhpcy5fb2xkQ29uZmlnID0gXy5jbG9uZURlZXAodGhpcy5jb25maWcpO1xyXG5cclxuICAgICAgICAvLyBBZGQgc2hvcnRjdXRzXHJcbiAgICAgICAgdGhpcy5hZGRTaG9ydGN1dHModGhpcy5jb25maWcuZ2xvYmFsU2hvcnRjdXRzKTtcclxuICAgICAgICB0aGlzLmFkZFNob3J0Y3V0cyh0aGlzLmNvbmZpZy5sb2NhbFNob3J0Y3V0cyk7ICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICAvLyBEZXNjcmliZSBwcml2YXRlIGZ1bmN0aW9uc1xyXG4gICAgcHJpdmF0ZSBzZW5kQ2hhbmdlRXZlbnQoKSB7XHJcbiAgICAgICAgLy8gUmVtb3ZlIHNob3J0Y3V0c1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2hvcnRjdXRzKHRoaXMuX29sZENvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2hvcnRjdXRzKHRoaXMuX29sZENvbmZpZy5sb2NhbFNob3J0Y3V0cyk7XHJcbiAgICAgICAgLy8gQWRkIHNob3J0Y3V0c1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuY29uZmlnLmdsb2JhbFNob3J0Y3V0cyk7XHJcbiAgICAgICAgdGhpcy5hZGRTaG9ydGN1dHModGhpcy5jb25maWcubG9jYWxTaG9ydGN1dHMpO1xyXG5cclxuICAgICAgICB0aGlzLiRyb290U2NvcGUuJGVtaXQoU2hvcnRjdXRzQ2hhbmdlZEV2ZW50LCB0aGlzLmNvbmZpZyk7XHJcbiAgICAgICAgLy8gU2F2ZSBjdXJyZW50IGNvbmZpZyB0byBvbGRDb25maWdcclxuICAgICAgICB0aGlzLl9vbGRDb25maWcgPSBfLmNsb25lRGVlcCh0aGlzLmNvbmZpZyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW1vdmVTaG9ydGN1dHMoY29sbGVjdGlvbjogU2hvcnRjdXRJdGVtW10pOiB2b2lkIHtcclxuICAgICAgICBfLmVhY2goY29sbGVjdGlvbiwgKGspID0+IHtcclxuICAgICAgICAgICAgdGhpcy5waXBTaG9ydGN1dHNSZWdpc3Rlci5yZW1vdmUoay5zaG9ydGN1dCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBrZXlwcmVzc1Nob3J0Y3V0KHNob3JjdXQ6IFNob3J0Y3V0SXRlbSwgZXZlbnQ6IEpRdWVyeUV2ZW50T2JqZWN0KSB7XHJcbiAgICAgICAgaWYgKHNob3JjdXQuYWNjZXNzICYmIF8uaXNGdW5jdGlvbihzaG9yY3V0LmFjY2VzcykpIHtcclxuICAgICAgICAgICAgaWYgKCFzaG9yY3V0LmFjY2VzcyhldmVudCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gXHJcblxyXG4gICAgICAgIGlmIChzaG9yY3V0LmtleXByZXNzKSB7XHJcbiAgICAgICAgICAgIHNob3JjdXQua2V5cHJlc3MoZXZlbnQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2hvcmN1dC5ocmVmKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gc2hvcmN1dC5ocmVmO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2hvcmN1dC51cmwpIHtcclxuICAgICAgICAgICAgdGhpcy4kbG9jYXRpb24udXJsKHNob3JjdXQudXJsKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNob3JjdXQuc3RhdGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJGluamVjdG9yLmhhcygnJHN0YXRlJykpIHtcclxuICAgICAgICAgICAgICAgIHZhciAkc3RhdGUgPSB0aGlzLiRpbmplY3Rvci5nZXQoJyRzdGF0ZScpO1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlWydnbyddKHNob3JjdXQuc3RhdGUsIHNob3JjdXQuc3RhdGVQYXJhbXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzaG9yY3V0LmV2ZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KHNob3JjdXQuZXZlbnQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSByYWlzZSBub3RpZmljYXRpb25cclxuICAgICAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3BpcFNob3J0Y3V0S2V5cHJlc3MnLCBzaG9yY3V0LnNob3J0Y3V0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhZGRTaG9ydGN1dHMoY29sbGVjdGlvbjogU2hvcnRjdXRJdGVtW10pOiB2b2lkIHtcclxuICAgICAgICBsZXQgZ2VuZXJhbE9wdGlvbnM6IFNob3J0Y3V0T3B0aW9uID0gdGhpcy5jb25maWcuZGVmYXVsdE9wdGlvbnMgPyB0aGlzLmNvbmZpZy5kZWZhdWx0T3B0aW9ucyA6IDxTaG9ydGN1dE9wdGlvbj57fTtcclxuICAgICAgICBcclxuICAgICAgICBfLmVhY2goY29sbGVjdGlvbiwgKGspID0+IHtcclxuICAgICAgICAgICAgbGV0IG9wdGlvbjogU2hvcnRjdXRPcHRpb24gPSBrLm9wdGlvbnMgPyBrLm9wdGlvbnMgOiBnZW5lcmFsT3B0aW9ucztcclxuICAgICAgICAgICAgbGV0IHRhcmdldDogYW55O1xyXG5cclxuICAgICAgICAgICAgdGFyZ2V0ID0gay50YXJnZXQgPyBrLnRhcmdldCA6IGsudGFyZ2V0SWQ7XHJcbiAgICAgICAgICAgIG9wdGlvbi5UYXJnZXQgPSB0YXJnZXQ7XHJcbiAgICAgICAgICAgIC8vIFJlZ2lzdHJhdGlvbiBvZiBrZXlib2FyZCBzaG9ydGN1dFxyXG4gICAgICAgICAgICB0aGlzLnBpcFNob3J0Y3V0c1JlZ2lzdGVyLmFkZChrLnNob3J0Y3V0LCAoZT86IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5rZXlwcmVzc1Nob3J0Y3V0KGssIGUpOyAgICAgICAgXHJcbiAgICAgICAgICAgIH0sIG9wdGlvbik7ICAgICAgICAgICAgICBcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBEZXNjcmliZSBwdWJsaWMgZnVuY3Rpb25zIFxyXG4gICAgcHVibGljIGdldCBjb25maWcoKTogU2hvcnRjdXRzQ29uZmlnIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZGVmYXVsdE9wdGlvbnMoKTogU2hvcnRjdXRPcHRpb24ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBkZWZhdWx0T3B0aW9ucyh2YWx1ZTogU2hvcnRjdXRPcHRpb24pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnMgPSB2YWx1ZSB8fCBudWxsO1xyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBnbG9iYWxTaG9ydGN1dHMoKTogU2hvcnRjdXRJdGVtW10ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgZ2xvYmFsU2hvcnRjdXRzKHZhbHVlOiBTaG9ydGN1dEl0ZW1bXSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMgPSB2YWx1ZSB8fCBbXTtcclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgbG9jYWxTaG9ydGN1dHMoKTogU2hvcnRjdXRJdGVtW10ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBsb2NhbFNob3J0Y3V0cyh2YWx1ZTogU2hvcnRjdXRJdGVtW10pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHMgPSB2YWx1ZSB8fCBbXTtcclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbihnbG9iYWxTaG9ydGN1dHM/OiBTaG9ydGN1dEl0ZW1bXSwgbG9jYWxTaG9ydGN1dHM/OiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQge1xyXG4gICAgICAgIGlmIChnbG9iYWxTaG9ydGN1dHMgJiYgXy5pc0FycmF5KGdsb2JhbFNob3J0Y3V0cykpIHtcclxuICAgICAgICAgICAgdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cyA9IGdsb2JhbFNob3J0Y3V0czsgICAgXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChsb2NhbFNob3J0Y3V0cyAmJiBfLmlzQXJyYXkobG9jYWxTaG9ydGN1dHMpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyA9IGxvY2FsU2hvcnRjdXRzOyAgICBcclxuICAgICAgICB9ICAgICAgICBcclxuXHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgb25Mb2NhbChsb2NhbFNob3J0Y3V0cz86IFNob3J0Y3V0SXRlbVtdKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKGxvY2FsU2hvcnRjdXRzICYmIF8uaXNBcnJheShsb2NhbFNob3J0Y3V0cykpIHtcclxuICAgICAgICAgICAgdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzID0gbG9jYWxTaG9ydGN1dHM7ICAgIFxyXG4gICAgICAgIH0gICAgICAgIFxyXG5cclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvZmYoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cyA9IFtdO1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyA9IFtdO1xyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFNob3J0Y3V0c1Byb3ZpZGVyIGltcGxlbWVudHMgSVNob3J0Y3V0c1Byb3ZpZGVyIHtcclxuICAgIHByaXZhdGUgX2NvbmZpZzogU2hvcnRjdXRzQ29uZmlnID0gbmV3IFNob3J0Y3V0c0NvbmZpZygpO1xyXG4gICAgcHJpdmF0ZSBfc2VydmljZTogU2hvcnRjdXRzU2VydmljZTtcclxuXHJcbiAgICBwdWJsaWMgZ2V0IGNvbmZpZygpOiBTaG9ydGN1dHNDb25maWcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWc7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBjb25maWcodmFsdWU6IFNob3J0Y3V0c0NvbmZpZykge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHZhbHVlIHx8IG5ldyBTaG9ydGN1dHNDb25maWcoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGRlZmF1bHRPcHRpb25zKCk6IFNob3J0Y3V0T3B0aW9uIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmRlZmF1bHRPcHRpb25zO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgZGVmYXVsdE9wdGlvbnModmFsdWU6IFNob3J0Y3V0T3B0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmRlZmF1bHRPcHRpb25zID0gdmFsdWUgfHwgbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGdsb2JhbFNob3J0Y3V0cygpOiBTaG9ydGN1dEl0ZW1bXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBnbG9iYWxTaG9ydGN1dHModmFsdWU6IFNob3J0Y3V0SXRlbVtdKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cyA9IHZhbHVlIHx8IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgbG9jYWxTaG9ydGN1dHMoKTogU2hvcnRjdXRJdGVtW10ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBsb2NhbFNob3J0Y3V0cyh2YWx1ZTogU2hvcnRjdXRJdGVtW10pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHMgPSB2YWx1ZSB8fCBbXTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgJGdldChcclxuICAgICAgICAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSwgXHJcbiAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIFxyXG4gICAgICAgICRsb2NhdGlvbjogbmcuSUxvY2F0aW9uU2VydmljZSwgXHJcbiAgICAgICAgJGluamVjdG9yOiBuZy5hdXRvLklJbmplY3RvclNlcnZpY2UsXHJcbiAgICAgICAgcGlwU2hvcnRjdXRzUmVnaXN0ZXI6IElTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2VcclxuICAgICkge1xyXG4gICAgICAgIFwibmdJbmplY3RcIjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX3NlcnZpY2UgPT0gbnVsbClcclxuICAgICAgICAgICAgdGhpcy5fc2VydmljZSA9IG5ldyBTaG9ydGN1dHNTZXJ2aWNlKHRoaXMuX2NvbmZpZywgJHJvb3RTY29wZSwgJHdpbmRvdywgJGxvY2F0aW9uLCAkaW5qZWN0b3IsIHBpcFNob3J0Y3V0c1JlZ2lzdGVyKTtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gdGhpcy5fc2VydmljZTtcclxuICAgIH1cclxufVxyXG5cclxuYW5ndWxhclxyXG4gICAgLm1vZHVsZSgncGlwU2hvcnRjdXRzJylcclxuICAgIC5wcm92aWRlcigncGlwU2hvcnRjdXRzJywgU2hvcnRjdXRzUHJvdmlkZXIpO1xyXG5cclxuIiwiYW5ndWxhci5tb2R1bGUoJ3BpcFNob3J0Y3V0cycsIFsnbmdNYXRlcmlhbCcsICd1aS5yb3V0ZXInXSk7XHJcblxyXG5pbXBvcnQgJy4vU2hvcmN1dHNSZWdpc3RlclNlcnZpY2UnO1xyXG5pbXBvcnQgJy4vU2hvcnRjdXRzU2VydmljZSc7XHJcbmltcG9ydCAnLi9TaG9ydGN1dERpcmVjdGl2ZSc7XHJcblxyXG5leHBvcnQgKiBmcm9tICcuL1Nob3J0Y3V0c1NlcnZpY2UnO1xyXG5leHBvcnQgKiBmcm9tICcuL1Nob3JjdXRzUmVnaXN0ZXJTZXJ2aWNlJzsiLCJ7XHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwU2VsZWN0ZWRcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBTZWxlY3RlZCcsIGZ1bmN0aW9uICgkcGFyc2UsICRtZENvbnN0YW50LCAkdGltZW91dCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZTogYW55LCAkZWxlbWVudCwgJGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgIGluZGV4R2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdGVkID8gJHBhcnNlKCRhdHRycy5waXBTZWxlY3RlZCkgOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGluZGV4U2V0dGVyID0gaW5kZXhHZXR0ZXIgPyBpbmRleEdldHRlci5hc3NpZ24gOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdGVkSWQgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdGVkSWQpIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpZFNldHRlciA9IGlkR2V0dGVyID8gaWRHZXR0ZXIuYXNzaWduIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VHZXR0ZXIgPSAkYXR0cnMucGlwU2VsZWN0ID8gJHBhcnNlKCRhdHRycy5waXBTZWxlY3QpIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBlbnRlclNwYWNlR2V0dGVyID0gJGF0dHJzLnBpcEVudGVyU3BhY2VQcmVzcyA/ICRwYXJzZSgkYXR0cnMucGlwRW50ZXJTcGFjZVByZXNzKSA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgbm9TY3JvbGwgPSAkYXR0cnMucGlwTm9TY3JvbGwsXHJcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZpZXIgPSAkYXR0cnMucGlwU2tpcEhpZGRlbiA/ICc6dmlzaWJsZScgOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWUgPSAkYXR0cnMucGlwVHJlZUxpc3QgPyAnLnBpcC1zZWxlY3RhYmxlLXRyZWUnIDogJy5waXAtc2VsZWN0YWJsZScsXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRleCA9IGluZGV4R2V0dGVyKCRzY29wZSksXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEVsZW1lbnRUYWJpbmV4ID0gJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnKSxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTZWxlY3RlZFdhdGNoID0gJGF0dHJzLnBpcFNlbGVjdGVkV2F0Y2gsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNTY3JvbGxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHZhcmlhYmxlcyBmb3IgdG91Y2ggICAgXHJcbiAgICAgICAgICAgICAgICB2YXIgdG91Y2hTdGFydFgsIHRvdWNoU3RhcnRZLCB0cmFja2luZ0NsaWNrLCB0cmFja2luZ0NsaWNrU3RhcnQsIHRhcmdldEVsZW1lbnQsIGxhc3RDbGlja1RpbWUsIGNhbmNlbE5leHRDbGljaztcclxuICAgICAgICAgICAgICAgIC8vIGNvbnN0YW50IGZvciB0b3VjaFxyXG4gICAgICAgICAgICAgICAgdmFyIHRvdWNoQm91bmRhcnkgPSAxMCxcclxuICAgICAgICAgICAgICAgICAgICB0YXBkZWxheSA9IDIwMCxcclxuICAgICAgICAgICAgICAgICAgICB0YXBUaW1lb3V0ID0gNzAwO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFNldCB0YWJpbmRleCBpZiBpdCdzIG5vdCBzZXQgeWV0XHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIGN1cnJlbnRFbGVtZW50VGFiaW5leCB8fCAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5vbignY2xpY2snLCBjbGFzc05hbWUsIG9uQ2xpY2tFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5vbigndG91Y2hzdGFydCcsIGNsYXNzTmFtZSwgb25Ub3VjaFN0YXJ0KTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCd0b3VjaG1vdmUnLCBjbGFzc05hbWUsIG9uVG91Y2hNb3ZlKTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCd0b3VjaGVuZCcsIGNsYXNzTmFtZSwgb25Ub3VjaEVuZCk7XHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5vbigndG91Y2hjYW5jZWwnLCBjbGFzc05hbWUsIG9uVG91Y2hDYW5jZWwpO1xyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2tleWRvd24nLCBvbktleURvd24pO1xyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2ZvY3VzaW4nLCBvbkZvY3VzSW4pO1xyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2ZvY3Vzb3V0Jywgb25Gb2N1c091dCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gV2F0Y2ggc2VsZWN0ZWQgaXRlbSBpbmRleFxyXG4gICAgICAgICAgICAgICAgaWYgKCEkYXR0cnMucGlwVHJlZUxpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGluZGV4R2V0dGVyLCBmdW5jdGlvbiAobmV3U2VsZWN0ZWRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogbmV3U2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChpZEdldHRlciwgZnVuY3Rpb24gKG5ld1NlbGVjdGVkSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtSWQ6IG5ld1NlbGVjdGVkSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFpc2VFdmVudDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFdhdGNoIHJlc3luYyBzZWxlY3Rpb25cclxuICAgICAgICAgICAgICAgIGlmIChwaXBTZWxlY3RlZFdhdGNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChwaXBTZWxlY3RlZFdhdGNoLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERlbGF5IHVwZGF0ZSB0byBhbGxvdyBuZy1yZXBlYXQgdG8gdXBkYXRlIERPTVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleEdldHRlcigkc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4OiBzZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBTZWxlY3QgaXRlbSBkZWZpbmVkIGJ5IGluZGV4XHJcbiAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXg6IHNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXM6ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lKVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gRnVuY3Rpb25zIGFuZCBsaXN0ZW5lcnNcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNlbGVjdEl0ZW0oaXRlbVBhcmFtcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Njcm9sbGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW1JbmRleCA9IGl0ZW1QYXJhbXMuaXRlbUluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtSWQgPSBpdGVtUGFyYW1zLml0ZW1JZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSBpdGVtUGFyYW1zLml0ZW1zIHx8ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lICsgbW9kaWZpZXIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtc0xlbmd0aCA9IGl0ZW1zLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbVBhcmFtcy5pdGVtKSByZXR1cm4gaXRlbVBhcmFtcy5pdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA9PT0gdW5kZWZpbmVkICYmIGl0ZW1JbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXggPSBpdGVtcy5pbmRleChpdGVtcy5maWx0ZXIoJ1twaXAtaWQ9JyArIGl0ZW1JZCArICddJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA+PSAwICYmIGl0ZW1JbmRleCA8IGl0ZW1zTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW1zW2l0ZW1JbmRleF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSgpKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmFpc2VFdmVudCA9IGl0ZW1QYXJhbXMucmFpc2VFdmVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuZmluZChjbGFzc05hbWUpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCBtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSBhbmd1bGFyLmVsZW1lbnQoaXRlbSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2VsZWN0ZWQgbWQtZm9jdXNlZCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZm9jdXMoKTsgLy8gdG9kbyDRgdC00LLQuNCz0LDQtdGCINGB0L/QuNGB0L7QuiDRgtGD0YIsINC90LAg0L/QtdGA0LLQvtC8INC/0YDQvtGF0L7QtNC1XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbm9TY3JvbGwpIHNjcm9sbFRvSXRlbShpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJhaXNlRXZlbnQpIGRlZmluZVNlbGVjdGVkSW5kZXgoaXRlbXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gZGVmaW5lU2VsZWN0ZWRJbmRleChpdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGRTZWxlY3RlZEluZGV4ID0gc2VsZWN0ZWRJbmRleDtcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGl0ZW1zLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJChpdGVtc1tpbmRleF0pLmhhc0NsYXNzKCdzZWxlY3RlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gaW5kZXg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEV4ZWN1dGUgY2FsbGJhY2sgdG8gbm90aWZ5IGFib3V0IGl0ZW0gc2VsZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9sZFNlbGVjdGVkSW5kZXggIT0gc2VsZWN0ZWRJbmRleCAmJiBzZWxlY3RlZEluZGV4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KHVwZGF0ZUluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KG9uU2VsZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZUluZGV4KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW1zW3NlbGVjdGVkSW5kZXhdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBzZWxlY3RlZEl0ZW0uYXR0cigncGlwLWlkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhTZXR0ZXIpIGluZGV4U2V0dGVyKCRzY29wZSwgc2VsZWN0ZWRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZFNldHRlcikgaWRTZXR0ZXIoJHNjb3BlLCBzZWxlY3RlZElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25TZWxlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvblNlbGVjdCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkSXRlbSA9IGFuZ3VsYXIuZWxlbWVudChpdGVtc1tzZWxlY3RlZEluZGV4XSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZElkID0gc2VsZWN0ZWRJdGVtLmF0dHIoJ3BpcC1pZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoYW5nZUdldHRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlR2V0dGVyKCRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6ICRlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtOiBzZWxlY3RlZEl0ZW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiBzZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZWN0ZWRJZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SW5kZXg6IHNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9sZEluZGV4OiBvbGRTZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNjcm9sbFRvSXRlbSgkaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub1Njcm9sbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyVG9wID0gJGVsZW1lbnQub2Zmc2V0KCkudG9wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJIZWlnaHQgPSAkZWxlbWVudC5oZWlnaHQoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gY29udGFpbmVyVG9wICsgY29udGFpbmVySGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtVG9wID0gJGl0ZW0ub2Zmc2V0KCkudG9wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtSGVpZ2h0ID0gJGl0ZW0ub3V0ZXJIZWlnaHQodHJ1ZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1Cb3R0b20gPSBpdGVtVG9wICsgaXRlbUhlaWdodCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsVG9wID0gJGVsZW1lbnQuc2Nyb2xsVG9wKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlzU2Nyb2xsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1Njcm9sbGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRhaW5lclRvcCA+IGl0ZW1Ub3ApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIGl0ZW1Ub3AgLSBjb250YWluZXJUb3ApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyQm90dG9tIDwgaXRlbUJvdHRvbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgaXRlbUJvdHRvbSAtIGNvbnRhaW5lckJvdHRvbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gZ2V0VGFyZ2V0RWxlbWVudEZyb21FdmVudFRhcmdldChldmVudFRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIE9uIHNvbWUgb2xkZXIgYnJvd3NlcnMgdGhlIGV2ZW50IHRhcmdldCBtYXkgYmUgYSB0ZXh0IG5vZGUuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50VGFyZ2V0Lm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnRUYXJnZXQucGFyZW50Tm9kZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudFRhcmdldDtcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdG91Y2hIYXNNb3ZlZChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0b3VjaCA9IGV2ZW50LmNoYW5nZWRUb3VjaGVzWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBib3VuZGFyeSA9IHRvdWNoQm91bmRhcnk7IC8vVG91Y2htb3ZlIGJvdW5kYXJ5LCBiZXlvbmQgd2hpY2ggYSBjbGljayB3aWxsIGJlIGNhbmNlbGxlZC5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKHRvdWNoLnBhZ2VYIC0gdG91Y2hTdGFydFgpID4gYm91bmRhcnkgfHwgTWF0aC5hYnModG91Y2gucGFnZVkgLSB0b3VjaFN0YXJ0WSkgPiBib3VuZGFyeSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25DbGlja0V2ZW50KGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IGV2ZW50LmN1cnJlbnRUYXJnZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvblRvdWNoU3RhcnQoZXYpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL2V2LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBldmVudCA9IGV2Lm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50Wyd0YXJnZXRUb3VjaGVzJ10ubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRhcmdldEVsZW1lbnQgPSBnZXRUYXJnZXRFbGVtZW50RnJvbUV2ZW50VGFyZ2V0KGV2ZW50LnRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRvdWNoID0gZXZlbnRbJ3RhcmdldFRvdWNoZXMnXVswXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdHJhY2tpbmdDbGljayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhY2tpbmdDbGlja1N0YXJ0ID0gZXZlbnQudGltZVN0YW1wO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEVsZW1lbnQgPSB0YXJnZXRFbGVtZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0b3VjaFN0YXJ0WCA9IHRvdWNoLnBhZ2VYO1xyXG4gICAgICAgICAgICAgICAgICAgIHRvdWNoU3RhcnRZID0gdG91Y2gucGFnZVk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZXZlbnQudGltZVN0YW1wIC0gbGFzdENsaWNrVGltZSkgPCB0YXBkZWxheSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uVG91Y2hNb3ZlKGV2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0cmFja2luZ0NsaWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBldi5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSB0b3VjaCBoYXMgbW92ZWQsIGNhbmNlbCB0aGUgY2xpY2sgdHJhY2tpbmdcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0RWxlbWVudCAhPT0gZ2V0VGFyZ2V0RWxlbWVudEZyb21FdmVudFRhcmdldChldmVudC50YXJnZXQpIHx8IHRvdWNoSGFzTW92ZWQoZXZlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvblRvdWNoRW5kKGV2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZvckVsZW1lbnQsIG5ld1RyYWNraW5nQ2xpY2tTdGFydCwgdGFyZ2V0VGFnTmFtZSwgc2Nyb2xsUGFyZW50LCB0b3VjaCwgbmV3dGFyZ2V0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdHJhY2tpbmdDbGljaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQgPSBldi5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFByZXZlbnQgcGhhbnRvbSBjbGlja3Mgb24gZmFzdCBkb3VibGUtdGFwIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZXZlbnQudGltZVN0YW1wIC0gbGFzdENsaWNrVGltZSkgPCB0YXBkZWxheSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxOZXh0Q2xpY2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZXZlbnQudGltZVN0YW1wIC0gdHJhY2tpbmdDbGlja1N0YXJ0KSA+IHRhcFRpbWVvdXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBSZXNldCB0byBwcmV2ZW50IHdyb25nIGNsaWNrIGNhbmNlbCBvbiBpbnB1dCBcclxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxOZXh0Q2xpY2sgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGFzdENsaWNrVGltZSA9IGV2ZW50LnRpbWVTdGFtcDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHJhY2tpbmdDbGlja1N0YXJ0ID0gdHJhY2tpbmdDbGlja1N0YXJ0O1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB0cmFja2luZ0NsaWNrU3RhcnQgPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTogZXYuY3VycmVudFRhcmdldCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmFpc2VFdmVudDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25Ub3VjaENhbmNlbChldikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbktleURvd24oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlDb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGNvbnRyb2wga2V5Q29kZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkVOVEVSIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuU1BBQ0UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudGVyU3BhY2VHZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGVyU3BhY2VHZXR0ZXIoJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiBzZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtOiAkZWxlbWVudC5maW5kKCcuc2VsZWN0ZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkxFRlRfQVJST1cgfHwga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IG5leHQgc2VsZWN0YWJsZSBjb250cm9sIGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpdGVtcyA9ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lICsgbW9kaWZpZXIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jID0gKGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHwga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSA/IDEgOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGVkSW5kZXggPSBzZWxlY3RlZEluZGV4ICsgaW5jO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG5leHQgY29udHJvbCBhcyBzZWxlY3RlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogbmV3U2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiBpdGVtcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRm9jdXNJbihldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIENob29zZSBzZWxlY3RlZCBlbGVtZW50XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW1zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArICcuc2VsZWN0ZWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIGFyZSBub3Qgc2VsZWN0ZWQgZWxlbWVudHMgdGhlbiBwaWNrIHRoZSBmaXJzdCBvbmVcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gaW5kZXhHZXR0ZXIoJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArIG1vZGlmaWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXg6IHNlbGVjdGVkSW5kZXggfHwgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiBpdGVtcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRm9jdXNPdXQoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArICcubWQtZm9jdXNlZCcgKyBtb2RpZmllcikucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxue1xyXG4gICAgaW50ZXJmYWNlIFVuc2F2ZWRDaGFuZ2VzU2NvcGUgZXh0ZW5kcyBuZy5JU2NvcGUge1xyXG4gICAgICAgIHVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlOiBGdW5jdGlvbjtcclxuICAgICAgICB1bnNhdmVkQ2hhbmdlc01lc3NhZ2U6IHN0cmluZztcclxuICAgICAgICBjYW5jZWxMZWF2ZTogRnVuY3Rpb247XHJcbiAgICAgICAgYWZ0ZXJMZWF2ZTogRnVuY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgVW5zYXZlZENoYW5nZXNMaW5rIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgJHNjb3BlOiBVbnNhdmVkQ2hhbmdlc1Njb3BlLFxyXG4gICAgICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICAkd2luZG93Lm9uYmVmb3JldW5sb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS51bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS51bnNhdmVkQ2hhbmdlc01lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCB1bmJpbmRGdW5jID0gJHNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUudW5zYXZlZENoYW5nZXNBdmFpbGFibGUoKSAmJiAhJHdpbmRvdy5jb25maXJtKCRzY29wZS51bnNhdmVkQ2hhbmdlc01lc3NhZ2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKCRzY29wZS5jYW5jZWxMZWF2ZSkgJiYgJHNjb3BlLmNhbmNlbExlYXZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKCRzY29wZS5hZnRlckxlYXZlKSAmJiAkc2NvcGUuYWZ0ZXJMZWF2ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgJHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB1bmJpbmRGdW5jKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBVbnNhdmVkQ2hhbmdlcyA9IGZ1bmN0aW9uICgkd2luZG93OiBuZy5JV2luZG93U2VydmljZSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQUUnLFxyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgdW5zYXZlZENoYW5nZXNBdmFpbGFibGU6ICcmcGlwVW5zYXZlZENoYW5nZXNBdmFpbGFibGUnLFxyXG4gICAgICAgICAgICAgICAgdW5zYXZlZENoYW5nZXNNZXNzYWdlOiAnQHBpcFVuc2F2ZWRDaGFuZ2VzTWVzc2FnZScsXHJcbiAgICAgICAgICAgICAgICBhZnRlckxlYXZlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQWZ0ZXJMZWF2ZScsXHJcbiAgICAgICAgICAgICAgICBjYW5jZWxMZWF2ZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0NhbmNlbExlYXZlJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlOiBVbnNhdmVkQ2hhbmdlc1Njb3BlKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgVW5zYXZlZENoYW5nZXNMaW5rKCRzY29wZSwgJHdpbmRvdyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKFwicGlwVW5zYXZlZENoYW5nZXNcIiwgW10pXHJcbiAgICAgICAgLmRpcmVjdGl2ZShcInBpcFVuc2F2ZWRDaGFuZ2VzXCIsIFVuc2F2ZWRDaGFuZ2VzKTtcclxufSJdfQ==