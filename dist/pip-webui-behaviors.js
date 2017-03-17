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
                _this.keydownListener(e);
            });
            $timeout(function () {
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
"use strict";
require("./unsaved_changes/UnsavedChanges");
require("./keyboard_shortcuts");
require("./focused/Focused");
angular.module('pipBehaviors', [
    'pipFocused',
    'pipSelected',
    'pipInfiniteScroll',
    'pipUnsavedChanges',
    'pipDraggable',
    'pipShortcuts'
]);
},{"./focused/Focused":2,"./keyboard_shortcuts":9,"./unsaved_changes/UnsavedChanges":11}],4:[function(require,module,exports){
{
    var InfiniteScrollLink_1 = (function () {
        function InfiniteScrollLink_1($rootScope, $window, $interval, $scope, $element, $attrs) {
            var _this = this;
            this.$rootScope = $rootScope;
            this.$window = $window;
            this.$interval = $interval;
            this.$scope = $scope;
            this.$element = $element;
            this.$attrs = $attrs;
            this.THROTTLE_MILLISECONDS = 500;
            this.checkWhenEnabled = null;
            this.scrollContainer = null;
            this.immediateCheck = true;
            this.scrollDistance = null;
            this.scrollEnabled = null;
            this.unregisterEventListener = null;
            this.useDocumentBottom = false;
            this.windowElement = null;
            this.windowElement = angular.element($window);
            this.onContainerScrollThrottle = _.throttle(function () {
                _this.onContainerScroll();
            }, this.THROTTLE_MILLISECONDS);
            $scope.$on('$destroy', function () {
                _this.scrollContainer.unbind('scroll', function () {
                    _this.onContainerScrollThrottle();
                });
                if (_this.unregisterEventListener !== null) {
                    _this.unregisterEventListener();
                    return _this.unregisterEventListener = null;
                }
            });
            $scope.$watch('pipScrollDistance', function (v) {
                _this.handleScrollDistance(v);
            });
            this.handleScrollDistance($scope.pipScrollDistance);
            $scope.$watch('pipScrollDisabled', function (v) {
                _this.handleScrollDisabled(v);
            });
            this.handleScrollDisabled($scope.pipScrollDisabled);
            $scope.$watch('pipScrollUseDocumentBottom', function (v) {
                _this.handleScrollUseDocumentBottom(v);
            });
            this.handleScrollUseDocumentBottom($scope.pipScrollUseDocumentBottom);
            this.changeContainer(this.windowElement);
            if ($scope.pipScrollListenForEvent) {
                this.unregisterEventListener = $rootScope.$on($scope.pipScrollListenForEvent, function () {
                    _this.onContainerScrollThrottle();
                });
            }
            $scope.$watch('pipScrollContainer', function (newContainer) {
                if (newContainer != _this.scrollContainer)
                    _this.handleScrollContainer(newContainer);
            });
            this.handleScrollContainer($scope.pipScrollContainer || []);
            if ($attrs.pipScrollParent !== null) {
                this.changeContainer(angular.element($element.parent()));
            }
            if ($attrs.pipScrolImmediateCheck !== null) {
                this.immediateCheck = $scope.$eval($attrs.pipScrolImmediateCheck);
            }
            $interval((function () {
                if (this.immediateCheck) {
                    return this.onContainerScrollThrottle();
                }
            }), 0, 1);
        }
        InfiniteScrollLink_1.prototype.height = function (element) {
            element = element[0] || element;
            if (isNaN(element.offsetHeight)) {
                return element.document.documentElement.clientHeight;
            }
            else {
                return element.offsetHeight;
            }
        };
        InfiniteScrollLink_1.prototype.offsetTop = function (element) {
            if (!element[0].getBoundingClientRect || element.css('none')) {
                return;
            }
            return element[0].getBoundingClientRect().top + this.pageYOffset(element);
        };
        InfiniteScrollLink_1.prototype.pageYOffset = function (element) {
            element = element[0] || element;
            if (isNaN(window.pageYOffset)) {
                return element.document.documentElement.scrollTop;
            }
            else {
                return element.ownerDocument.defaultView.pageYOffset;
            }
        };
        InfiniteScrollLink_1.prototype.onContainerScroll = function () {
            var _this = this;
            var containerBottom, containerTopOffset, elementBottom, remaining, shouldScroll;
            if (this.scrollContainer === this.windowElement) {
                containerBottom = this.height(this.scrollContainer) + this.pageYOffset(this.scrollContainer[0].document.documentElement);
                elementBottom = this.offsetTop(this.$element) + this.height(this.$element);
            }
            else {
                containerBottom = this.height(this.scrollContainer);
                containerTopOffset = 0;
                if (this.offsetTop(this.scrollContainer) !== void 0) {
                    containerTopOffset = this.offsetTop(this.scrollContainer);
                }
                elementBottom = this.offsetTop(this.$element) - containerTopOffset + this.height(this.$element);
            }
            if (this.useDocumentBottom) {
                elementBottom = this.height((this.$element[0].ownerDocument || this.$element[0].document).documentElement);
            }
            remaining = elementBottom - containerBottom;
            shouldScroll = remaining <= this.height(this.scrollContainer) * this.scrollDistance + 1;
            if (shouldScroll) {
                this.checkWhenEnabled = true;
                if (this.scrollEnabled) {
                    if (this.$scope.$$phase || this.$rootScope.$$phase) {
                        return this.$scope.pipInfiniteScroll();
                    }
                    else {
                        return this.$scope.$apply(function () {
                            _this.$scope.pipInfiniteScroll();
                        });
                    }
                }
            }
            else {
                return this.checkWhenEnabled = false;
            }
        };
        InfiniteScrollLink_1.prototype.handleScrollDistance = function (v) {
            return this.scrollDistance = parseFloat(v) || 0;
        };
        InfiniteScrollLink_1.prototype.handleScrollDisabled = function (v) {
            this.scrollEnabled = !v;
            if (this.scrollEnabled && this.checkWhenEnabled) {
                this.checkWhenEnabled = false;
                this.onContainerScrollThrottle();
            }
        };
        InfiniteScrollLink_1.prototype.handleScrollUseDocumentBottom = function (v) {
            return this.useDocumentBottom = v;
        };
        InfiniteScrollLink_1.prototype.changeContainer = function (newContainer) {
            var _this = this;
            if (this.scrollContainer) {
                this.scrollContainer.unbind('scroll', function () {
                    _this.onContainerScrollThrottle();
                });
            }
            this.scrollContainer = newContainer;
            if (newContainer) {
                return this.scrollContainer.bind('scroll', function () {
                    _this.onContainerScrollThrottle();
                });
            }
        };
        InfiniteScrollLink_1.prototype.handleScrollContainer = function (newContainer) {
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
                newContainer = this.$element.parents().find(newContainer);
            }
            if (newContainer != null && (!Array.isArray(newContainer) ||
                (Array.isArray(newContainer) && newContainer.length > 0))) {
                return this.changeContainer(newContainer);
            }
            else {
                throw new Error("Invalid pip-scroll-container attribute.");
            }
        };
        return InfiniteScrollLink_1;
    }());
    var InfiniteScroll = function ($rootScope, $window, $interval) {
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
                new InfiniteScrollLink_1($rootScope, $window, $interval, $scope, $element, $attrs);
            }
        };
    };
    InfiniteScroll.$inject = ['$rootScope', '$window', '$interval'];
    angular.module("pipInfiniteScroll", [])
        .directive('pipInfiniteScroll', InfiniteScroll);
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
    var SelectedLink_1 = (function () {
        function SelectedLink_1($parse, $mdConstant, $timeout, $scope, $element, $attrs) {
            var _this = this;
            this.$mdConstant = $mdConstant;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.$element = $element;
            this.$attrs = $attrs;
            this.touchBoundary = 10;
            this.tapdelay = 200;
            this.tapTimeout = 700;
            this.indexGetter = $attrs.pipSelected ? $parse($attrs.pipSelected) : null;
            this.indexSetter = this.indexGetter ? this.indexGetter.assign : null;
            this.idGetter = $attrs.pipSelectedId ? $parse($attrs.pipSelectedId) : null;
            this.idSetter = this.idGetter ? this.idGetter.assign : null;
            this.changeGetter = $attrs.pipSelect ? $parse($attrs.pipSelect) : null;
            this.enterSpaceGetter = $attrs.pipEnterSpacePress ? $parse($attrs.pipEnterSpacePress) : null;
            this.noScroll = $attrs.pipNoScroll;
            this.modifier = $attrs.pipSkipHidden ? ':visible' : '';
            this.className = $attrs.pipTreeList ? '.pip-selectable-tree' : '.pip-selectable';
            this.selectedIndex = this.indexGetter($scope);
            this.currentElementTabinex = $element.attr('tabindex');
            this.pipSelectedWatch = $attrs.pipSelectedWatch;
            this.isScrolled = false;
            $element.attr('tabindex', this.currentElementTabinex || 0);
            $element.on('click', this.className, function (event) {
                _this.onClickEvent(event);
            });
            $element.on('touchstart', this.className, function (event) {
                _this.onTouchStart(event);
            });
            $element.on('touchmove', this.className, function (event) {
                _this.onTouchMove(event);
            });
            $element.on('touchend', this.className, function (event) {
                _this.onTouchEnd(event);
            });
            $element.on('touchcancel', this.className, function (event) {
                _this.onTouchCancel(event);
            });
            $element.on('keydown', function (event) {
                _this.onKeyDown(event);
            });
            $element.on('focusin', function (event) {
                _this.onFocusIn(event);
            });
            $element.on('focusout', function (event) {
                _this.onFocusOut(event);
            });
            if (!$attrs.pipTreeList) {
                $scope.$watch(this.indexGetter, function (newSelectedIndex) {
                    _this.selectItem({
                        itemIndex: newSelectedIndex
                    });
                });
            }
            else {
                $scope.$watch(this.idGetter, function (newSelectedId) {
                    $timeout(function () {
                        _this.selectItem({
                            itemId: newSelectedId,
                            raiseEvent: true
                        });
                    }, 0);
                });
            }
            if (this.pipSelectedWatch) {
                $scope.$watch(this.pipSelectedWatch, function () {
                    $timeout(function () {
                        _this.selectedIndex = _this.indexGetter($scope);
                        _this.selectItem({
                            itemIndex: _this.selectedIndex
                        });
                    }, 100);
                });
            }
            this.selectItem({
                itemIndex: this.selectedIndex,
                items: $element.find(this.className)
            });
        }
        SelectedLink_1.prototype.selectItem = function (itemParams) {
            if (this.isScrolled)
                return;
            var itemIndex = itemParams.itemIndex, itemId = itemParams.itemId, items = itemParams.items || this.$element.find(this.className + this.modifier), itemsLength = items.length, item = function () {
                if (itemParams.item)
                    return itemParams.item;
                if (itemIndex === undefined && itemIndex === -1) {
                    itemIndex = items.index(items.filter('[pip-id=' + itemId + ']'));
                }
                if (itemIndex >= 0 && itemIndex < itemsLength) {
                    return items[itemIndex];
                }
                return false;
            }, raiseEvent = itemParams.raiseEvent;
            item = item();
            if (item) {
                this.$element.find(this.className).removeClass('selected md-focused');
                item = angular.element(item)
                    .addClass('selected md-focused')
                    .focus();
                if (!this.noScroll)
                    this.scrollToItem(item);
                if (raiseEvent)
                    this.defineSelectedIndex(items);
            }
        };
        ;
        SelectedLink_1.prototype.defineSelectedIndex = function (items) {
            var oldSelectedIndex = this.selectedIndex;
            this.selectedIndex = -1;
            for (var index = 0; index < items.length; index++) {
                if ($(items[index]).hasClass('selected')) {
                    this.selectedIndex = index;
                    break;
                }
            }
            if (oldSelectedIndex != this.selectedIndex && this.selectedIndex !== -1) {
                this.$scope.$apply(updateIndex);
            }
            else {
                this.$scope.$apply(onSelect);
            }
            function updateIndex() {
                var selectedItem = angular.element(items[this.selectedIndex]), selectedId = selectedItem.attr('pip-id');
                if (this.indexSetter)
                    this.indexSetter(this.$scope, this.selectedIndex);
                if (this.idSetter)
                    this.idSetter(this.$scope, selectedId);
                onSelect();
            }
            ;
            function onSelect() {
                var selectedItem = angular.element(items[this.selectedIndex]), selectedId = selectedItem.attr('pip-id');
                if (this.changeGetter) {
                    this.changeGetter(this.$scope, {
                        $event: {
                            target: this.$element,
                            item: selectedItem,
                            index: this.selectedIndex,
                            id: selectedId,
                            newIndex: this.selectedIndex,
                            oldIndex: oldSelectedIndex
                        }
                    });
                }
            }
        };
        ;
        SelectedLink_1.prototype.scrollToItem = function ($item) {
            var _this = this;
            if (this.noScroll || !$item.offset())
                return;
            var containerTop = this.$element.offset().top, containerHeight = this.$element.height(), containerBottom = containerTop + containerHeight, itemTop = $item.offset().top, itemHeight = $item.outerHeight(true), itemBottom = itemTop + itemHeight, containerScrollTop = this.$element.scrollTop();
            this.isScrolled = true;
            this.$timeout(function () {
                _this.isScrolled = false;
            }, 100);
            if (containerTop > itemTop) {
                this.$element.scrollTop(containerScrollTop + itemTop - containerTop);
            }
            else if (containerBottom < itemBottom) {
                this.$element.scrollTop(containerScrollTop + itemBottom - containerBottom);
            }
        };
        ;
        SelectedLink_1.prototype.getTargetElementFromEventTarget = function (eventTarget) {
            if (eventTarget.nodeType === Node.TEXT_NODE) {
                return eventTarget.parentNode;
            }
            return eventTarget;
        };
        ;
        SelectedLink_1.prototype.touchHasMoved = function (event) {
            var touch = event.changedTouches[0], boundary = this.touchBoundary;
            if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
                return true;
            }
            return false;
        };
        ;
        SelectedLink_1.prototype.onClickEvent = function (event) {
            this.selectItem({
                item: event.currentTarget,
                raiseEvent: true
            });
        };
        SelectedLink_1.prototype.onTouchStart = function (event) {
            var ev = event.originalEvent;
            if (ev['targetTouches'].length > 1) {
                return true;
            }
            var targetElement = this.getTargetElementFromEventTarget(ev.target), touch = ev['targetTouches'][0];
            this.trackingClick = true;
            this.trackingClickStart = ev.timeStamp;
            this.targetElement = targetElement;
            this.touchStartX = touch.pageX;
            this.touchStartY = touch.pageY;
            return true;
        };
        SelectedLink_1.prototype.onTouchMove = function (event) {
            if (!this.trackingClick) {
                return true;
            }
            var ev = event.originalEvent;
            if (this.targetElement !== this.getTargetElementFromEventTarget(ev.target) || this.touchHasMoved(ev)) {
                this.trackingClick = false;
                this.targetElement = null;
            }
            return true;
        };
        SelectedLink_1.prototype.onTouchEnd = function (event) {
            var forElement, newTrackingClickStart, targetTagName, scrollParent, touch, newtargetElement = this.targetElement;
            if (!this.trackingClick) {
                return true;
            }
            var ev = event.originalEvent;
            if ((ev.timeStamp - this.lastClickTime) < this.tapdelay) {
                this.cancelNextClick = true;
                return true;
            }
            if ((ev.timeStamp - this.trackingClickStart) > this.tapTimeout) {
                return true;
            }
            this.cancelNextClick = false;
            this.lastClickTime = event.timeStamp;
            newTrackingClickStart = this.trackingClickStart;
            this.trackingClick = false;
            this.trackingClickStart = 0;
            this.selectItem({
                item: event.currentTarget,
                raiseEvent: true
            });
            return false;
        };
        SelectedLink_1.prototype.onTouchCancel = function (event) {
            this.trackingClick = false;
            this.targetElement = null;
        };
        SelectedLink_1.prototype.onKeyDown = function (event) {
            var keyCode = event.which || event.keyCode;
            if (keyCode == this.$mdConstant.KEY_CODE.ENTER || keyCode == this.$mdConstant.KEY_CODE.SPACE) {
                event.preventDefault();
                event.stopPropagation();
                if (this.enterSpaceGetter) {
                    this.enterSpaceGetter(this.$scope, {
                        $event: {
                            target: this.$element,
                            index: this.selectedIndex,
                            item: this.$element.find('.selected')
                        }
                    });
                }
            }
            else if (keyCode == this.$mdConstant.KEY_CODE.LEFT_ARROW || keyCode == this.$mdConstant.KEY_CODE.RIGHT_ARROW ||
                keyCode == this.$mdConstant.KEY_CODE.UP_ARROW || keyCode == this.$mdConstant.KEY_CODE.DOWN_ARROW) {
                event.preventDefault();
                event.stopPropagation();
                var items = this.$element.find(this.className + this.modifier), inc = (keyCode == this.$mdConstant.KEY_CODE.RIGHT_ARROW || keyCode == this.$mdConstant.KEY_CODE.DOWN_ARROW) ? 1 : -1, newSelectedIndex = this.selectedIndex + inc;
                this.selectItem({
                    itemIndex: newSelectedIndex,
                    items: items,
                    raiseEvent: true
                });
            }
        };
        SelectedLink_1.prototype.onFocusIn = function (event) {
            var items, selectedItem = this.$element.find(this.className + '.selected');
            selectedItem.addClass('md-focused');
            if (selectedItem.length === 0) {
                this.selectedIndex = this.indexGetter(this.$scope);
                items = this.$element.find(this.className + this.modifier);
                this.selectItem({
                    itemIndex: this.selectedIndex || 0,
                    items: items,
                    raiseEvent: true
                });
            }
        };
        SelectedLink_1.prototype.onFocusOut = function (event) {
            this.$element.find(this.className + '.md-focused' + this.modifier).removeClass('md-focused');
        };
        return SelectedLink_1;
    }());
    var Selected = function ($parse, $mdConstant, $timeout) {
        return {
            restrict: 'A',
            scope: false,
            link: function ($scope, $element, $attrs) {
                new SelectedLink_1($parse, $mdConstant, $timeout, $scope, $element, $attrs);
            }
        };
    };
    Selected.$inject = ['$parse', '$mdConstant', '$timeout'];
    angular.module("pipSelected", [])
        .directive('pipSelected', Selected);
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZHJhZ2dhYmxlL2RyYWdnYWJsZS50cyIsInNyYy9mb2N1c2VkL0ZvY3VzZWQudHMiLCJzcmMvaW5kZXgudHMiLCJzcmMvaW5maW5pdGVfc2Nyb2xsL0luZmluaXRlU2Nyb2xsLnRzIiwic3JjL2tleWJvYXJkX3Nob3J0Y3V0cy9LZXlib2FyZFNob3J0Y3V0LnRzIiwic3JjL2tleWJvYXJkX3Nob3J0Y3V0cy9TaG9yY3V0c1JlZ2lzdGVyU2VydmljZS50cyIsInNyYy9rZXlib2FyZF9zaG9ydGN1dHMvU2hvcnRjdXREaXJlY3RpdmUudHMiLCJzcmMva2V5Ym9hcmRfc2hvcnRjdXRzL1Nob3J0Y3V0c1NlcnZpY2UudHMiLCJzcmMva2V5Ym9hcmRfc2hvcnRjdXRzL2luZGV4LnRzIiwic3JjL3NlbGVjdGVkL1NlbGVjdGVkLnRzIiwic3JjL3Vuc2F2ZWRfY2hhbmdlcy9VbnNhdmVkQ2hhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0NBLENBQUM7SUFDRyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVwRCxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRTtRQUUvQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDakIsS0FBSyxDQUFDLFVBQVUsR0FBRyxVQUFVLEtBQUs7WUFDOUIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixDQUFDO1lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxTQUFT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Z0JBQ25CLE9BQU8sQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO2dCQUM5QixVQUFVLEVBQUUsQ0FBQztZQUNqQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFDTCwyQkFBQztJQUFELENBekJBLEFBeUJDLElBQUE7SUFFRCxJQUFNLGNBQWMsR0FBRyxVQUFVLE9BQTBCO1FBQ3ZELE1BQU0sQ0FBQztZQUNILFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFO2dCQUNILHVCQUF1QixFQUFFLDZCQUE2QjtnQkFDdEQscUJBQXFCLEVBQUUsMkJBQTJCO2dCQUNsRCxVQUFVLEVBQUUsOEJBQThCO2dCQUMxQyxXQUFXLEVBQUUsK0JBQStCO2FBQy9DO1lBQ0QsSUFBSSxFQUFFLFVBQVUsTUFBMkI7Z0JBQ3ZDLElBQUksb0JBQWtCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLENBQUM7U0FDSixDQUFDO0lBQ04sQ0FBQyxDQUFBO0lBRUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7U0FDbEMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxyXG57XHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwRHJhZ2dhYmxlXCIsIFtdKTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLnNlcnZpY2UoJ3BpcERyYWdnYWJsZScsIGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuICAgICAgICBzY29wZS5pbnB1dEV2ZW50ID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChldmVudC50b3VjaGVzKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy9DaGVja2luZyBib3RoIGlzIG5vdCByZWR1bmRlbnQuIElmIG9ubHkgY2hlY2sgaWYgdG91Y2hlcyBpc0RlZmluZWQsIGFuZ3VsYXJqcyBpc0RlZm5pZWQgd2lsbCByZXR1cm4gZXJyb3IgYW5kIHN0b3AgdGhlIHJlbWFpbmluZyBzY3JpcHR5IGlmIGV2ZW50Lm9yaWdpbmFsRXZlbnQgaXMgbm90IGRlZmluZWQuXHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50Lm9yaWdpbmFsRXZlbnQpICYmIGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGV2ZW50O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcERyYWcnLFxyXG4gICAgICAgIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcGFyc2UsICRkb2N1bWVudCwgJHdpbmRvdywgcGlwRHJhZ2dhYmxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZTogYW55LCBlbGVtZW50LCBhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudmFsdWUgPSBhdHRycy5uZ0RyYWc7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIExPTkdfUFJFU1MgPSA1MDsgLy8gNTBtcyBmb3IgbG9uZ3ByZXNzXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9mZnNldCwgX2NlbnRlckFuY2hvciA9IGZhbHNlLCBfbXgsIF9teSwgX3R4LCBfdHksIF9tcngsIF9tcnk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9oYXNUb3VjaCA9ICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpIHx8ICg8YW55PndpbmRvdykuRG9jdW1lbnRUb3VjaDsgLy8gJiYgZG9jdW1lbnQgaW5zdGFuY2VvZiBEb2N1bWVudFRvdWNoOyAvLyBEb2N1bWVudFRvdWNoIGlzIG5vdCBkZWZpbmVkIVxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfcHJlc3NFdmVudHMgPSAndG91Y2hzdGFydCBtb3VzZWRvd24nO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfbW92ZUV2ZW50cyA9ICd0b3VjaG1vdmUgbW91c2Vtb3ZlJztcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX3JlbGVhc2VFdmVudHMgPSAndG91Y2hlbmQgbW91c2V1cCc7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kcmFnSGFuZGxlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyB0byBpZGVudGlmeSB0aGUgZWxlbWVudCBpbiBvcmRlciB0byBwcmV2ZW50IGdldHRpbmcgc3VwZXJmbG91cyBldmVudHMgd2hlbiBhIHNpbmdsZSBlbGVtZW50IGhhcyBib3RoIGRyYWcgYW5kIGRyb3AgZGlyZWN0aXZlcyBvbiBpdC5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX215aWQgPSBzY29wZS4kaWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kYXRhID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kcmFnT2Zmc2V0ID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kcmFnRW5hYmxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX3ByZXNzVGltZXIgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX2VsZW1lbnRTdHlsZTogYW55ID0ge307XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdGFydENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdGFydCkgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3RvcENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdG9wKSB8fCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdWNjZXNzQ2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N1Y2Nlc3MpIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFsbG93VHJhbnNmb3JtID0gYW5ndWxhci5pc0RlZmluZWQoYXR0cnMuYWxsb3dUcmFuc2Zvcm0pID8gc2NvcGUuJGV2YWwoYXR0cnMuYWxsb3dUcmFuc2Zvcm0pIDogZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBnZXREcmFnRGF0YSA9ICRwYXJzZShhdHRycy5waXBEcmFnRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsU2Nyb2xsID0gdG9Cb29sZWFuKGF0dHJzLnBpcFZlcnRpY2FsU2Nyb2xsKSB8fCB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBob3Jpem9udGFsU2Nyb2xsID0gdG9Cb29sZWFuKGF0dHJzLnBpcEhvcml6b250YWxTY3JvbGwpIHx8IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRpb25EaXN0YW5jZSA9IHBhcnNlRmxvYXQoYXR0cnMucGlwQWN0aXZhdGlvbkRpc3RhbmNlKSB8fCA3NSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRGlzdGFuY2UgPSBwYXJzZUZsb2F0KGF0dHJzLnBpcFNjcm9sbERpc3RhbmNlKSB8fCA1MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsUGFyZW50ID0gZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQod2luZG93KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyR2V0dGVyID0gJHBhcnNlKGF0dHJzLnBpcFNjcm9sbENvbnRhaW5lcik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlcmVnaXN0cmF0aW9uIGZ1bmN0aW9uIGZvciBtb3VzZSBtb3ZlIGV2ZW50cyBpbiAkcm9vdFNjb3BlIHRyaWdnZXJlZCBieSBqcUxpdGUgdHJpZ2dlciBoYW5kbGVyXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lciA9IGFuZ3VsYXIubm9vcDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7IC8vIHByZXZlbnQgbmF0aXZlIGRyYWdcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgdG8gc2VlIGlmIGRyYWcgaGFuZGxlKHMpIHdhcyBzcGVjaWZpZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgcXVlcnlTZWxlY3RvckFsbCBpcyBhdmFpbGFibGUsIHdlIHVzZSB0aGlzIGluc3RlYWQgb2YgZmluZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhcyBKUUxpdGUgZmluZCBpcyBsaW1pdGVkIHRvIHRhZ25hbWVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkcmFnSGFuZGxlczogYW55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yQWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnSGFuZGxlcyA9IGFuZ3VsYXIuZWxlbWVudChlbGVtZW50WzBdLnF1ZXJ5U2VsZWN0b3JBbGwoJ1twaXAtZHJhZy1oYW5kbGVdJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0hhbmRsZXMgPSBlbGVtZW50LmZpbmQoJ1twaXAtZHJhZy1oYW5kbGVdJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRyYWdIYW5kbGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdIYW5kbGUgPSBkcmFnSGFuZGxlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVMaXN0ZW5lcnModHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHNjcm9sbCBjb250YWluZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbFBhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KGVsZW1lbnQucGFyZW50KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGF0dHJzLnBpcFNjcm9sbENvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHNjcm9sbENvbnRhaW5lckdldHRlcihzY29wZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHdpbmRvdyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvQm9vbGVhbih2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPT0gJzEnIHx8IHZhbHVlID09ICd0cnVlJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIG9uRGVzdHJveSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5waXBEcmFnLCBvbkVuYWJsZUNoYW5nZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5waXBDZW50ZXJBbmNob3IsIG9uQ2VudGVyQW5jaG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2lyZSB1cCB0b3VjaCBldmVudHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9kcmFnSGFuZGxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUocykgc3BlY2lmaWVkLCB1c2UgdGhvc2UgdG8gaW5pdGlhdGUgZHJhZ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdIYW5kbGUub24oX3ByZXNzRXZlbnRzLCBvbnByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGhhbmRsZShzKSBzcGVjaWZpZWQsIHVzZSB0aGUgZWxlbWVudCBhcyB0aGUgaGFuZGxlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKF9wcmVzc0V2ZW50cywgb25wcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfaGFzVG91Y2ggJiYgZWxlbWVudFswXS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09IFwiaW1nXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTsgLy8gcHJldmVudCBuYXRpdmUgZHJhZyBmb3IgaW1hZ2VzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EZXN0cm95KGVuYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVMaXN0ZW5lcnMoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdFbmFibGVkID0gKG5ld1ZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkNlbnRlckFuY2hvcihuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQobmV3VmFsKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jZW50ZXJBbmNob3IgPSAobmV3VmFsIHx8ICd0cnVlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBpc0NsaWNrYWJsZUVsZW1lbnQoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmlzRGVmaW5lZChhbmd1bGFyLmVsZW1lbnQoZXZ0LnRhcmdldCkuYXR0cihcInBpcC1jYW5jZWwtZHJhZ1wiKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8qXHJcbiAgICAgICAgICAgICAgICAgICAgICogV2hlbiB0aGUgZWxlbWVudCBpcyBjbGlja2VkIHN0YXJ0IHRoZSBkcmFnIGJlaGF2aW91clxyXG4gICAgICAgICAgICAgICAgICAgICAqIE9uIHRvdWNoIGRldmljZXMgYXMgYSBzbWFsbCBkZWxheSBzbyBhcyBub3QgdG8gcHJldmVudCBuYXRpdmUgd2luZG93IHNjcm9sbGluZ1xyXG4gICAgICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ucHJlc3MoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2RyYWdFbmFibGVkKXJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NsaWNrYWJsZUVsZW1lbnQoZXZ0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0LnR5cGUgPT0gXCJtb3VzZWRvd25cIiAmJiBldnQuYnV0dG9uICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvIG5vdCBzdGFydCBkcmFnZ2luZyBvbiByaWdodC1jbGlja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlRWxlbWVudFN0eWxlcygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9oYXNUb3VjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9wcmVzc1RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmxvbmdwcmVzcyhldnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgTE9OR19QUkVTUyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX21vdmVFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vbihfcmVsZWFzZUV2ZW50cywgY2FuY2VsUHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25sb25ncHJlc3MoZXZ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNhdmVFbGVtZW50U3R5bGVzKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZWxlbWVudFN0eWxlLmxlZnQgPSBlbGVtZW50LmNzcygnY3NzJykgfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS50b3AgPSBlbGVtZW50LmNzcygndG9wJykgfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS5wb3NpdGlvbiA9IGVsZW1lbnQuY3NzKCdwb3NpdGlvbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZWxlbWVudFN0eWxlLndpZHRoID0gZWxlbWVudC5jc3MoJ3dpZHRoJyk7ICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY2FuY2VsUHJlc3MoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChfcHJlc3NUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vZmYoX21vdmVFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9mZihfcmVsZWFzZUV2ZW50cywgY2FuY2VsUHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25sb25ncHJlc3MoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2RyYWdFbmFibGVkKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWxsb3dUcmFuc2Zvcm0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZHJhZ09mZnNldCA9IG9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZHJhZ09mZnNldCA9IHtsZWZ0OiBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQsIHRvcDogZG9jdW1lbnQuYm9keS5zY3JvbGxUb3B9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxhbnk+ZWxlbWVudCkuY2VudGVyWCA9IGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGggLyAyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPGFueT5lbGVtZW50KS5jZW50ZXJZID0gZWxlbWVudFswXS5vZmZzZXRIZWlnaHQgLyAyO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX214ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX215ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX21yeCA9IF9teCAtIG9mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXJ5ID0gX215IC0gb2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9jZW50ZXJBbmNob3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eCA9IF9teCAtICg8YW55PmVsZW1lbnQpLmNlbnRlclggLSAkd2luZG93LnBhZ2VYT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R5ID0gX215IC0gKDxhbnk+ZWxlbWVudCkuY2VudGVyWSAtICR3aW5kb3cucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHggPSBfbXggLSBfbXJ4IC0gJHdpbmRvdy5wYWdlWE9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eSA9IF9teSAtIF9tcnkgLSAkd2luZG93LnBhZ2VZT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX21vdmVFdmVudHMsIG9ubW92ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vbihfcmVsZWFzZUV2ZW50cywgb25yZWxlYXNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBldmVudCBpcyB1c2VkIHRvIHJlY2VpdmUgbWFudWFsbHkgdHJpZ2dlcmVkIG1vdXNlIG1vdmUgZXZlbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGpxTGl0ZSB1bmZvcnR1bmF0ZWx5IG9ubHkgc3VwcG9ydHMgdHJpZ2dlckhhbmRsZXIoLi4uKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWUgaHR0cDovL2FwaS5qcXVlcnkuY29tL3RyaWdnZXJIYW5kbGVyL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbignZHJhZ2dhYmxlOl90cmlnZ2VySGFuZGxlck1vdmUnLCBvbm1vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbignZHJhZ2dhYmxlOl90cmlnZ2VySGFuZGxlck1vdmUnLCBmdW5jdGlvbiAoZXZlbnQsIG9yaWdFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25tb3ZlKG9yaWdFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25tb3ZlKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbGVtZW50Lmhhc0NsYXNzKCdwaXAtZHJhZ2dpbmcnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RhdGEgPSBnZXREcmFnRGF0YShzY29wZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOnN0YXJ0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IF9teCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBfbXksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHg6IF90eCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eTogX3R5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBldnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBfZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9uRHJhZ1N0YXJ0Q2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdGFydENhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IF9kYXRhLCAkZXZlbnQ6IGV2dH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXggPSBwaXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VYO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXkgPSBwaXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VZO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhvcml6b250YWxTY3JvbGwgfHwgdmVydGljYWxTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdUb1Njcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2NlbnRlckFuY2hvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R4ID0gX214IC0gKDxhbnk+ZWxlbWVudCkuY2VudGVyWCAtIF9kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHkgPSBfbXkgLSAoPGFueT5lbGVtZW50KS5jZW50ZXJZIC0gX2RyYWdPZmZzZXQudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R4ID0gX214IC0gX21yeCAtIF9kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHkgPSBfbXkgLSBfbXJ5IC0gX2RyYWdPZmZzZXQudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3ZlRWxlbWVudChfdHgsIF90eSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTptb3ZlJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogX214LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogX215LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHg6IF90eCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5OiBfdHksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IF9kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdWlkOiBfbXlpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdPZmZzZXQ6IF9kcmFnT2Zmc2V0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25yZWxlYXNlKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOmVuZCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IF9teCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IF9teSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR4OiBfdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eTogX3R5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGV2dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBfZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBvbkRyYWdDb21wbGV0ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpZDogX215aWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnZ2luZycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnBhcmVudCgpLmZpbmQoJy5waXAtZHJhZy1lbnRlcicpLnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNldCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub2ZmKF9tb3ZlRXZlbnRzLCBvbm1vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub2ZmKF9yZWxlYXNlRXZlbnRzLCBvbnJlbGVhc2UpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9uRHJhZ1N0b3BDYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdG9wQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogX2RhdGEsICRldmVudDogZXZ0fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdDb21wbGV0ZShldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvbkRyYWdTdWNjZXNzQ2FsbGJhY2spcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N1Y2Nlc3NDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBfZGF0YSwgJGV2ZW50OiBldnR9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZXNldCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFsbG93VHJhbnNmb3JtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe3RyYW5zZm9ybTogJycsICd6LWluZGV4JzogJycsICctd2Via2l0LXRyYW5zZm9ybSc6ICcnLCAnLW1zLXRyYW5zZm9ybSc6ICcnfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moeydwb3NpdGlvbic6IF9lbGVtZW50U3R5bGUucG9zaXRpb24sIHRvcDogX2VsZW1lbnRTdHlsZS50b3AsIGxlZnQ6IF9lbGVtZW50U3R5bGUubGVmdCwgJ3otaW5kZXgnOiAnJywgd2lkdGg6IF9lbGVtZW50U3R5bGUud2lkdGh9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gbW92ZUVsZW1lbnQoeCwgeSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZVdpZHRoID0gZWxlbWVudC5jc3MoJ3dpZHRoJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbGxvd1RyYW5zZm9ybSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiA5OTk5OSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnbWF0cml4M2QoMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgJyArIHggKyAnLCAnICsgeSArICcsIDAsIDEpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnLW1zLXRyYW5zZm9ybSc6ICdtYXRyaXgoMSwgMCwgMCwgMSwgJyArIHggKyAnLCAnICsgeSArICcpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xlZnQnOiB4ICsgJ3B4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAndG9wJzogeSArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2ZpeGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogZVdpZHRoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gZHJhZ1RvU2Nyb2xsKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2Nyb2xsWCA9IDAsIHNjcm9sbFkgPSAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vZmZzZXQoKSB8fCB7bGVmdDogMCwgdG9wOiAwfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaG9yaXpvbnRhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyTGVmdCA9IG9mZnNldChzY3JvbGxDb250YWluZXIpLmxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyV2lkdGggPSBzY3JvbGxDb250YWluZXIuaW5uZXJXaWR0aCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclJpZ2h0ID0gY29udGFpbmVyTGVmdCArIGNvbnRhaW5lcldpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoX214IC0gY29udGFpbmVyTGVmdCkgPCBhY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxYID0gLXNjcm9sbERpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKGNvbnRhaW5lclJpZ2h0IC0gX214KSA8IGFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFggPSBzY3JvbGxEaXN0YW5jZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZlcnRpY2FsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3AgPSBvZmZzZXQoc2Nyb2xsQ29udGFpbmVyKS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVySGVpZ2h0ID0gc2Nyb2xsQ29udGFpbmVyLmlubmVySGVpZ2h0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gY29udGFpbmVyVG9wICsgY29udGFpbmVySGVpZ2h0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoX215IC0gY29udGFpbmVyVG9wKSA8IGFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFkgPSAtc2Nyb2xsRGlzdGFuY2UgKyAzMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKChjb250YWluZXJCb3R0b20gLSBfbXkpIDwgYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWSA9IHNjcm9sbERpc3RhbmNlIC0gMzA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbFggIT09IDAgfHwgc2Nyb2xsWSAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsTGVmdCA9IHNjcm9sbENvbnRhaW5lci5zY3JvbGxMZWZ0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsVG9wID0gc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci5zY3JvbGxMZWZ0KGNvbnRhaW5lclNjcm9sbExlZnQgKyBzY3JvbGxYKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgc2Nyb2xsWSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcERyb3AnLCBcclxuICAgICAgICBmdW5jdGlvbiAoJHBhcnNlLCAkdGltZW91dCwgJHdpbmRvdywgJGRvY3VtZW50LCBwaXBEcmFnZ2FibGUpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGU6IGFueSwgZWxlbWVudCwgYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudmFsdWUgPSBhdHRycy5waXBEcm9wO1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuaXNUb3VjaGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBfbGFzdERyb3BUb3VjaCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB2YXIgX215aWQgPSBzY29wZS4kaWQ7XHJcbiAgICAgICAgICAgICAgICB2YXIgX2Ryb3BFbmFibGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJvcENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyb3BTdWNjZXNzKTsvLyB8fCBmdW5jdGlvbigpe307XHJcbiAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3RhcnRDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RhcnQpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N0b3BDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RvcCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgb25EcmFnTW92ZUNhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdNb3ZlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGF0dHJzLnBpcERyb3AsIG9uRW5hYmxlQ2hhbmdlKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95Jywgb25EZXN0cm95KTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTpzdGFydCcsIG9uRHJhZ1N0YXJ0KTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTptb3ZlJywgb25EcmFnTW92ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6ZW5kJywgb25EcmFnRW5kKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRlc3Ryb3koZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkVuYWJsZUNoYW5nZShuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kcm9wRW5hYmxlZCA9IG5ld1ZhbDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdTdGFydChldnQsIG9iaikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX2Ryb3BFbmFibGVkKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBpc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMucGlwRHJhZ1N0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N0YXJ0Q2FsbGJhY2soc2NvcGUsIHskZGF0YTogb2JqLmRhdGEsICRldmVudDogb2JqfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdNb3ZlKGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJvcEVuYWJsZWQpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGlzVG91Y2hpbmcob2JqLngsIG9iai55LCBvYmouZWxlbWVudCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5waXBEcmFnTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdNb3ZlQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogb2JqLmRhdGEsICRldmVudDogb2JqfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdFbmQoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBkb24ndCBsaXN0ZW4gdG8gZHJvcCBldmVudHMgaWYgdGhpcyBpcyB0aGUgZWxlbWVudCBiZWluZyBkcmFnZ2VkXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSB1cGRhdGUgdGhlIHN0eWxlcyBhbmQgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJvcEVuYWJsZWQgfHwgX215aWQgPT09IG9iai51aWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlRHJhZ1N0eWxlcyhmYWxzZSwgb2JqLmVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjYWxsIHRoZSBwaXBEcmFnZ2FibGUgcGlwRHJhZ1N1Y2Nlc3MgZWxlbWVudCBjYWxsYmFja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqLmNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmouY2FsbGJhY2sob2JqKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLnBpcERyb3BTdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25Ecm9wQ2FsbGJhY2soc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IG9iai5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IG9iaixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRhcmdldDogc2NvcGUuJGV2YWwoc2NvcGUudmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLnBpcERyYWdTdG9wKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N0b3BDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBvYmouZGF0YSwgJGV2ZW50OiBvYmp9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVEcmFnU3R5bGVzKGZhbHNlLCBvYmouZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaXNUb3VjaGluZyhtb3VzZVgsIG1vdXNlWSwgZHJhZ0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdG91Y2hpbmcgPSBoaXRUZXN0KG1vdXNlWCwgbW91c2VZKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pc1RvdWNoaW5nID0gdG91Y2hpbmc7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvdWNoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9sYXN0RHJvcFRvdWNoID0gZWxlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlRHJhZ1N0eWxlcyh0b3VjaGluZywgZHJhZ0VsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0b3VjaGluZztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGVEcmFnU3R5bGVzKHRvdWNoaW5nLCBkcmFnRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0b3VjaGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnRWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX2xhc3REcm9wVG91Y2ggPT0gZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbGFzdERyb3BUb3VjaCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnLWVudGVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdFbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1vdmVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBoaXRUZXN0KHgsIHkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYm91bmRzID0gZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB4IC09ICRkb2N1bWVudFswXS5ib2R5LnNjcm9sbExlZnQgKyAkZG9jdW1lbnRbMF0uZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgeSAtPSAkZG9jdW1lbnRbMF0uYm9keS5zY3JvbGxUb3AgKyAkZG9jdW1lbnRbMF0uZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geCA+PSBib3VuZHMubGVmdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiB4IDw9IGJvdW5kcy5yaWdodFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiB5IDw9IGJvdW5kcy5ib3R0b21cclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgeSA+PSBib3VuZHMudG9wO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBQcmV2ZW50RHJhZycsIGZ1bmN0aW9uICgkcGFyc2UsICR0aW1lb3V0KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlOiBhbnksIGVsZW1lbnQsIGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBhYnNvcmJFdmVudF8oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCAmJiBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24gJiYgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwQ2FuY2VsRHJhZycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmZpbmQoJyonKS5hdHRyKCdwaXAtY2FuY2VsLWRyYWcnLCAncGlwLWNhbmNlbC1kcmFnJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbiIsIntcclxuICAgIGludGVyZmFjZSBGb2N1c2VkU2NvcGUgZXh0ZW5kcyBuZy5JU2NvcGUge1xyXG4gICAgICAgIHBpcEZvY3VzZWRDb2xvcjogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZFJlYmluZDogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZFRhYmluZGV4OiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBGb2N1c2VkT3BhY2l0eTogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZERhdGE6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcFdpdGhIaWRkZW46IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcFJlYmluZDogRnVuY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIEZvY3VzZWRBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIG5nTW9kZWw6IGFueTtcclxuICAgICAgICBwaXBGb2N1c2VkRGF0YTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIEZvY3VzZWRMaW5rIGltcGxlbWVudHMgbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcHJpdmF0ZSBjb250cm9sczogSlF1ZXJ5O1xyXG4gICAgICAgIHByaXZhdGUgY29udHJvbHNMZW5ndGg6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIGNvbG9yOiBzdHJpbmc7XHJcbiAgICAgICAgcHJpdmF0ZSBvcGFjaXR5RGVsdGE6IG51bWJlciA9IDAuNDtcclxuICAgICAgICBwcml2YXRlIG9wYWNpdHlMaW1pdDogbnVtYmVyID0gMC41O1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IEZvY3VzZWRTY29wZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAkYXR0cnM6IEZvY3VzZWRBdHRyaWJ1dGVzLFxyXG4gICAgICAgICAgICBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJG1kQ29uc3RhbnQ6IGFueSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZVxyXG4gICAgICAgICkge1xyXG5cclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2tleWRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5rZXlkb3duTGlzdGVuZXIoZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCRhdHRycy5uZ01vZGVsKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCduZ01vZGVsJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KHRoaXMuaW5pdCk7XHJcbiAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCRhdHRycy5waXBGb2N1c2VkRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwRm9jdXNlZERhdGEnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQodGhpcy5pbml0KTtcclxuICAgICAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGluaXQoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gdGhpcy4kc2NvcGUucGlwV2l0aEhpZGRlbiAmJiB0aGlzLiRzY29wZS5waXBXaXRoSGlkZGVuKCkgPyAnLnBpcC1mb2N1c2FibGUnIDogJy5waXAtZm9jdXNhYmxlOnZpc2libGUnO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xzID0gdGhpcy4kZWxlbWVudC5maW5kKHNlbGVjdG9yKTtcclxuICAgICAgICAgICAgdGhpcy5jb250cm9sc0xlbmd0aCA9IHRoaXMuY29udHJvbHMubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLmNoZWNrVGFiaW5kZXgodGhpcy5jb250cm9scyk7XHJcbiAgICAgICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lcnNcclxuICAgICAgICAgICAgdGhpcy5jb250cm9scy5vbignZm9jdXMnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoJCh0YXJnZXQpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kc2NvcGUucGlwUmViaW5kICYmIHRoaXMuJHNjb3BlLnBpcFJlYmluZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy4kc2NvcGUucGlwRm9jdXNlZE9wYWNpdHkgfHwgIXRoaXMuJHNjb3BlLnBpcEZvY3VzZWRPcGFjaXR5KCkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xvciA9ICQodGFyZ2V0KS5jc3MoJ2JhY2tncm91bmRDb2xvcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIHRoaXMucmdiYSh0aGlzLmNvbG9yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5hZGRDbGFzcygnbWQtZm9jdXNlZCBtZC1mb2N1c2VkLW9wYWNpdHknKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0pLm9uKCdmb2N1c291dCcsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXZlbnQuY3VycmVudFRhcmdldDtcclxuICAgICAgICAgICAgICAgIGlmICghJCh0YXJnZXQpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuJHNjb3BlLnBpcEZvY3VzZWRPcGFjaXR5IHx8ICF0aGlzLiRzY29wZS5waXBGb2N1c2VkT3BhY2l0eSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gJCh0aGlzKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIF9jb2xvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLmNzcygnYmFja2dyb3VuZENvbG9yJywgXCJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkIG1kLWZvY3VzZWQtb3BhY2l0eScpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHJnYmEoY29sb3IpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRDb2xvciAmJiB0aGlzLiRzY29wZS5waXBGb2N1c2VkQ29sb3IoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRDb2xvcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhcnIgPSBjb2xvci5zcGxpdChcIihcIilbMV0uc3BsaXQoXCIpXCIpWzBdLnNwbGl0KFwiLFwiKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghYXJyIHx8IGFyci5sZW5ndGggPCAzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJydcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHJlZCwgYmx1ZSwgZ3JlZW4sIG9wYWNpdHk7XHJcblxyXG4gICAgICAgICAgICBvcGFjaXR5ID0gYXJyLmxlbmd0aCA9PSAzID8gMSA6IHBhcnNlRmxvYXQoYXJyWzNdKTtcclxuICAgICAgICAgICAgcmVkID0gYXJyWzBdO1xyXG4gICAgICAgICAgICBibHVlID0gYXJyWzFdO1xyXG4gICAgICAgICAgICBncmVlbiA9IGFyclsyXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChvcGFjaXR5IDwgdGhpcy5vcGFjaXR5TGltaXQpIHtcclxuICAgICAgICAgICAgICAgIG9wYWNpdHkgKz0gdGhpcy5vcGFjaXR5RGVsdGE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBvcGFjaXR5IC09IHRoaXMub3BhY2l0eURlbHRhO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJ3JnYmEoJyArIHJlZCArICcsICcgKyBibHVlICsgJywgJyArIGdyZWVuICsgJywgJyArIG9wYWNpdHkgKyAnKSc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHNldFRhYmluZGV4KGVsZW1lbnQsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCB2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNoZWNrVGFiaW5kZXgoY29udHJvbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBfLmZpbmRJbmRleChjb250cm9scywgKGMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjWyd0YWJpbmRleCddID4gLTE7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ID09IC0xICYmIGNvbnRyb2xzLmxlbmd0aCA+IDAgJiYgdGhpcy4kc2NvcGUucGlwRm9jdXNlZFRhYmluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFRhYmluZGV4KGFuZ3VsYXIuZWxlbWVudChjb250cm9sc1swXSksIHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRUYWJpbmRleCgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBrZXlkb3duTGlzdGVuZXIoZSkge1xyXG4gICAgICAgICAgICBjb25zdCBrZXlDb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIGNvbnRyb2wga2V5Q29kZVxyXG4gICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkxFRlRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5VUF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPV1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdFxyXG4gICAgICAgICAgICAgICAgICAgIGluY3JlbWVudCA9IChrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHwga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1cpID8gMSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vdmVUb0NvbnRyb2wgPSB0aGlzLmNvbnRyb2xzLmluZGV4KHRoaXMuY29udHJvbHMuZmlsdGVyKFwiLm1kLWZvY3VzZWRcIikpICsgaW5jcmVtZW50O1xyXG4gICAgICAgICAgICAgICAgLy8gTW92ZSBmb2N1cyB0byBuZXh0IGNvbnRyb2xcclxuICAgICAgICAgICAgICAgIGlmIChtb3ZlVG9Db250cm9sID49IDAgJiYgbW92ZVRvQ29udHJvbCA8IHRoaXMuY29udHJvbHNMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRyb2xzW21vdmVUb0NvbnRyb2xdLmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgRm9jdXNlZCA9IGZ1bmN0aW9uICgkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCBcclxuICAgICAgICAkbWRDb25zdGFudDogYW55LCBcclxuICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZVxyXG4gICAgKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRDb2xvcjogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRSZWJpbmQ6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBGb2N1c2VkVGFiaW5kZXg6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBGb2N1c2VkT3BhY2l0eTogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWREYXRhOiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwV2l0aEhpZGRlbjogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcFJlYmluZDogJyY/J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGU6IEZvY3VzZWRTY29wZSwgJGVsZW1lbnQ6IEpRdWVyeSwgJGF0dHJzOiBGb2N1c2VkQXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICAgICAgbmV3IEZvY3VzZWRMaW5rKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgJHRpbWVvdXQsICRtZENvbnN0YW50LCAkd2luZG93KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZShcInBpcEZvY3VzZWRcIiwgW10pXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwRm9jdXNlZCcsIEZvY3VzZWQpO1xyXG59Iiwi77u/aW1wb3J0ICcuL3Vuc2F2ZWRfY2hhbmdlcy9VbnNhdmVkQ2hhbmdlcyc7XHJcbmltcG9ydCAnLi9rZXlib2FyZF9zaG9ydGN1dHMnO1xyXG5pbXBvcnQgJy4vZm9jdXNlZC9Gb2N1c2VkJztcclxuXHJcbmFuZ3VsYXIubW9kdWxlKCdwaXBCZWhhdmlvcnMnLCBbXHJcbiAgICAncGlwRm9jdXNlZCcsXHJcbiAgICAncGlwU2VsZWN0ZWQnLFxyXG4gICAgJ3BpcEluZmluaXRlU2Nyb2xsJyxcclxuICAgICdwaXBVbnNhdmVkQ2hhbmdlcycsXHJcbiAgICAncGlwRHJhZ2dhYmxlJyxcclxuICAgICdwaXBTaG9ydGN1dHMnXHJcbl0pOyIsIntcclxuXHJcbiAgICBpbnRlcmZhY2UgSW5maW5pdGVTY3JvbGxTY29wZSBleHRlbmRzIG5nLklTY29wZSB7XHJcbiAgICAgICAgcGlwSW5maW5pdGVTY3JvbGw6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcFNjcm9sbENvbnRhaW5lcjogSlF1ZXJ5O1xyXG4gICAgICAgIHBpcFNjcm9sbERpc3RhbmNlOiBudW1iZXIgfCBzdHJpbmc7XHJcbiAgICAgICAgcGlwU2Nyb2xsRGlzYWJsZWQ6IGJvb2xlYW47XHJcbiAgICAgICAgcGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b206IGJvb2xlYW47XHJcbiAgICAgICAgcGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQ6IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgSW5maW5pdGVTY3JvbGxBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIHBpcFNjcm9sbFBhcmVudDogYW55O1xyXG4gICAgICAgIHBpcFNjcm9sSW1tZWRpYXRlQ2hlY2s6IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBJbmZpbml0ZVNjcm9sbExpbmsge1xyXG4gICAgICAgIHByaXZhdGUgVEhST1RUTEVfTUlMTElTRUNPTkRTOiBudW1iZXIgPSA1MDA7XHJcbiAgICAgICAgcHJpdmF0ZSBjaGVja1doZW5FbmFibGVkID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIHNjcm9sbENvbnRhaW5lciA9IG51bGw7XHJcbiAgICAgICAgcHJpdmF0ZSBpbW1lZGlhdGVDaGVjayA9IHRydWU7XHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxEaXN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxFbmFibGVkID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIHVucmVnaXN0ZXJFdmVudExpc3RlbmVyID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIHVzZURvY3VtZW50Qm90dG9tID0gZmFsc2U7XHJcbiAgICAgICAgcHJpdmF0ZSB3aW5kb3dFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIG9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGU6IEZ1bmN0aW9uO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkaW50ZXJ2YWw6IG5nLklJbnRlcnZhbFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHNjb3BlOiBJbmZpbml0ZVNjcm9sbFNjb3BlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGF0dHJzOiBJbmZpbml0ZVNjcm9sbEF0dHJpYnV0ZXNcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgdGhpcy53aW5kb3dFbGVtZW50ID0gYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlID0gXy50aHJvdHRsZSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgIH0sIHRoaXMuVEhST1RUTEVfTUlMTElTRUNPTkRTKTtcclxuXHJcbiAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIudW5iaW5kKCdzY3JvbGwnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVucmVnaXN0ZXJFdmVudExpc3RlbmVyICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnVucmVnaXN0ZXJFdmVudExpc3RlbmVyID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBTY3JvbGxEaXN0YW5jZScsICh2KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbERpc3RhbmNlKHYpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxEaXN0YW5jZSgkc2NvcGUucGlwU2Nyb2xsRGlzdGFuY2UpO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsRGlzYWJsZWQnLCAodikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxEaXNhYmxlZCh2KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsRGlzYWJsZWQoJHNjb3BlLnBpcFNjcm9sbERpc2FibGVkKTtcclxuXHJcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tJywgKHYpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20odik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKCRzY29wZS5waXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNoYW5nZUNvbnRhaW5lcih0aGlzLndpbmRvd0VsZW1lbnQpO1xyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLnBpcFNjcm9sbExpc3RlbkZvckV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVucmVnaXN0ZXJFdmVudExpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJHNjb3BlLnBpcFNjcm9sbExpc3RlbkZvckV2ZW50LCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsQ29udGFpbmVyJywgKG5ld0NvbnRhaW5lcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPSB0aGlzLnNjcm9sbENvbnRhaW5lcilcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbENvbnRhaW5lcihuZXdDb250YWluZXIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxDb250YWluZXIoJHNjb3BlLnBpcFNjcm9sbENvbnRhaW5lciB8fCBbXSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoJGF0dHJzLnBpcFNjcm9sbFBhcmVudCAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VDb250YWluZXIoYW5ndWxhci5lbGVtZW50KCRlbGVtZW50LnBhcmVudCgpKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCRhdHRycy5waXBTY3JvbEltbWVkaWF0ZUNoZWNrICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmltbWVkaWF0ZUNoZWNrID0gJHNjb3BlLiRldmFsKCRhdHRycy5waXBTY3JvbEltbWVkaWF0ZUNoZWNrKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgJGludGVydmFsKChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbW1lZGlhdGVDaGVjaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSksIDAsIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoZWlnaHQoZWxlbWVudCkge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXSB8fCBlbGVtZW50O1xyXG4gICAgICAgICAgICBpZiAoaXNOYU4oZWxlbWVudC5vZmZzZXRIZWlnaHQpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9mZnNldFRvcChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGlmICghZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QgfHwgZWxlbWVudC5jc3MoJ25vbmUnKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCArIHRoaXMucGFnZVlPZmZzZXQoZWxlbWVudCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHBhZ2VZT2Zmc2V0KGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnRbMF0gfHwgZWxlbWVudDtcclxuICAgICAgICAgICAgaWYgKGlzTmFOKHdpbmRvdy5wYWdlWU9mZnNldCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LnBhZ2VZT2Zmc2V0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uQ29udGFpbmVyU2Nyb2xsKCkge1xyXG4gICAgICAgICAgICBsZXQgY29udGFpbmVyQm90dG9tLFxyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyVG9wT2Zmc2V0LFxyXG4gICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSxcclxuICAgICAgICAgICAgICAgIHJlbWFpbmluZyxcclxuICAgICAgICAgICAgICAgIHNob3VsZFNjcm9sbDtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbENvbnRhaW5lciA9PT0gdGhpcy53aW5kb3dFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSB0aGlzLmhlaWdodCh0aGlzLnNjcm9sbENvbnRhaW5lcikgKyB0aGlzLnBhZ2VZT2Zmc2V0KHRoaXMuc2Nyb2xsQ29udGFpbmVyWzBdLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gdGhpcy5vZmZzZXRUb3AodGhpcy4kZWxlbWVudCkgKyB0aGlzLmhlaWdodCh0aGlzLiRlbGVtZW50KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IHRoaXMuaGVpZ2h0KHRoaXMuc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vZmZzZXRUb3AodGhpcy5zY3JvbGxDb250YWluZXIpICE9PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQgPSB0aGlzLm9mZnNldFRvcCh0aGlzLnNjcm9sbENvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gdGhpcy5vZmZzZXRUb3AodGhpcy4kZWxlbWVudCkgLSBjb250YWluZXJUb3BPZmZzZXQgKyB0aGlzLmhlaWdodCh0aGlzLiRlbGVtZW50KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMudXNlRG9jdW1lbnRCb3R0b20pIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSB0aGlzLmhlaWdodCgodGhpcy4kZWxlbWVudFswXS5vd25lckRvY3VtZW50IHx8ICggPCBhbnkgPiB0aGlzLiRlbGVtZW50WzBdKS5kb2N1bWVudCkuZG9jdW1lbnRFbGVtZW50KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVtYWluaW5nID0gZWxlbWVudEJvdHRvbSAtIGNvbnRhaW5lckJvdHRvbTtcclxuICAgICAgICAgICAgc2hvdWxkU2Nyb2xsID0gcmVtYWluaW5nIDw9IHRoaXMuaGVpZ2h0KHRoaXMuc2Nyb2xsQ29udGFpbmVyKSAqIHRoaXMuc2Nyb2xsRGlzdGFuY2UgKyAxO1xyXG5cclxuICAgICAgICAgICAgaWYgKHNob3VsZFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja1doZW5FbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbEVuYWJsZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy4kc2NvcGUuJCRwaGFzZSB8fCB0aGlzLiRyb290U2NvcGUuJCRwaGFzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kc2NvcGUucGlwSW5maW5pdGVTY3JvbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kc2NvcGUuJGFwcGx5KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLnBpcEluZmluaXRlU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNoZWNrV2hlbkVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTY3JvbGxEaXN0YW5jZSh2KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNjcm9sbERpc3RhbmNlID0gcGFyc2VGbG9hdCh2KSB8fCAwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTY3JvbGxEaXNhYmxlZCh2KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsRW5hYmxlZCA9ICF2O1xyXG4gICAgICAgICAgICBpZiAodGhpcy5zY3JvbGxFbmFibGVkICYmIHRoaXMuY2hlY2tXaGVuRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja1doZW5FbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSh2KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnVzZURvY3VtZW50Qm90dG9tID0gdjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY2hhbmdlQ29udGFpbmVyKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5zY3JvbGxDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyLnVuYmluZCgnc2Nyb2xsJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyID0gbmV3Q29udGFpbmVyO1xyXG4gICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxDb250YWluZXIuYmluZCgnc2Nyb2xsJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGFuZGxlU2Nyb2xsQ29udGFpbmVyKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICBpZiAoKG5ld0NvbnRhaW5lciA9PSBudWxsKSB8fCBuZXdDb250YWluZXIubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbmV3Q29udGFpbmVyLmFwcGVuZCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgbmV3Q29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KG5ld0NvbnRhaW5lcltuZXdDb250YWluZXIubGVuZ3RoIC0gMV0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBuZXdDb250YWluZXIgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb250YWluZXIgPSB0aGlzLiRlbGVtZW50LnBhcmVudHMoKS5maW5kKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIgIT0gbnVsbCAmJiAoIUFycmF5LmlzQXJyYXkobmV3Q29udGFpbmVyKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgIChBcnJheS5pc0FycmF5KG5ld0NvbnRhaW5lcikgJiYgbmV3Q29udGFpbmVyLmxlbmd0aCA+IDApKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2hhbmdlQ29udGFpbmVyKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHBpcC1zY3JvbGwtY29udGFpbmVyIGF0dHJpYnV0ZS5cIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IEluZmluaXRlU2Nyb2xsID0gZnVuY3Rpb24gKFxyXG4gICAgICAgICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLFxyXG4gICAgICAgICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgICRpbnRlcnZhbDogbmcuSUludGVydmFsU2VydmljZVxyXG4gICAgKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHBpcEluZmluaXRlU2Nyb2xsOiAnJicsXHJcbiAgICAgICAgICAgICAgICBwaXBTY3JvbGxDb250YWluZXI6ICc9JyxcclxuICAgICAgICAgICAgICAgIHBpcFNjcm9sbERpc3RhbmNlOiAnPScsXHJcbiAgICAgICAgICAgICAgICBwaXBTY3JvbGxEaXNhYmxlZDogJz0nLFxyXG4gICAgICAgICAgICAgICAgcGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b206ICc9JyxcclxuICAgICAgICAgICAgICAgIHBpcFNjcm9sbExpc3RlbkZvckV2ZW50OiAnQCdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiBJbmZpbml0ZVNjcm9sbFNjb3BlLFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgICAgICRhdHRyczogSW5maW5pdGVTY3JvbGxBdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgbmV3IEluZmluaXRlU2Nyb2xsTGluaygkcm9vdFNjb3BlLCAkd2luZG93LCAkaW50ZXJ2YWwsICRzY29wZSwgJGVsZW1lbnQsICRhdHRycyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoXCJwaXBJbmZpbml0ZVNjcm9sbFwiLCBbXSlcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBJbmZpbml0ZVNjcm9sbCcsIEluZmluaXRlU2Nyb2xsKTtcclxufSIsImV4cG9ydCBjbGFzcyBTaG9ydGN1dE9wdGlvbiB7XHJcbiAgICBUeXBlOiBLZXlib2FyZEV2ZW50O1xyXG4gICAgUHJvcGFnYXRlOiBib29sZWFuO1xyXG4gICAgRGlzYWJsZUluSW5wdXQ6IGJvb2xlYW47XHJcbiAgICBUYXJnZXQ6IGFueTsgLy8gRXZlbnQgdGFyZ2V0IG9iamVjdFxyXG4gICAgS2V5Y29kZTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgS2V5Ym9hcmRFdmVudCB7XHJcbiAgICBzdGF0aWMgS2V5ZG93bjogc3RyaW5nID0gJ2tleWRvd24nO1xyXG4gICAgc3RhdGljIEtleXVwOiBzdHJpbmcgPSAna2V5dXAnO1xyXG4gICAgc3RhdGljIEtleXByZXNzOiBzdHJpbmcgPSAna2V5cHJlc3MnO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgS2V5Ym9hcmRTaG9ydGN1dCB7XHJcbiAgICBwcml2YXRlIHNoaWZ0X251bXMgPSB7XHJcbiAgICAgICAgXCJgXCI6IFwiflwiLFxyXG4gICAgICAgIFwiMVwiOiBcIiFcIixcclxuICAgICAgICBcIjJcIjogXCJAXCIsXHJcbiAgICAgICAgXCIzXCI6IFwiI1wiLFxyXG4gICAgICAgIFwiNFwiOiBcIiRcIixcclxuICAgICAgICBcIjVcIjogXCIlXCIsXHJcbiAgICAgICAgXCI2XCI6IFwiXlwiLFxyXG4gICAgICAgIFwiN1wiOiBcIiZcIixcclxuICAgICAgICBcIjhcIjogXCIqXCIsXHJcbiAgICAgICAgXCI5XCI6IFwiKFwiLFxyXG4gICAgICAgIFwiMFwiOiBcIilcIixcclxuICAgICAgICBcIi1cIjogXCJfXCIsXHJcbiAgICAgICAgXCI9XCI6IFwiK1wiLFxyXG4gICAgICAgIFwiO1wiOiBcIjpcIixcclxuICAgICAgICBcIidcIjogXCJcXFwiXCIsXHJcbiAgICAgICAgXCIsXCI6IFwiPFwiLFxyXG4gICAgICAgIFwiLlwiOiBcIj5cIixcclxuICAgICAgICBcIi9cIjogXCI/XCIsXHJcbiAgICAgICAgXCJcXFxcXCI6IFwifFwiXHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgc3BlY2lhbF9rZXlzID0ge1xyXG4gICAgICAgICdlc2MnOiAyNyxcclxuICAgICAgICAnZXNjYXBlJzogMjcsXHJcbiAgICAgICAgJ3RhYic6IDksXHJcbiAgICAgICAgJ3NwYWNlJzogMzIsXHJcbiAgICAgICAgJ3JldHVybic6IDEzLFxyXG4gICAgICAgICdlbnRlcic6IDEzLFxyXG4gICAgICAgICdiYWNrc3BhY2UnOiA4LFxyXG5cclxuICAgICAgICAnc2Nyb2xsbG9jayc6IDE0NSxcclxuICAgICAgICAnc2Nyb2xsX2xvY2snOiAxNDUsXHJcbiAgICAgICAgJ3Njcm9sbCc6IDE0NSxcclxuICAgICAgICAnY2Fwc2xvY2snOiAyMCxcclxuICAgICAgICAnY2Fwc19sb2NrJzogMjAsXHJcbiAgICAgICAgJ2NhcHMnOiAyMCxcclxuICAgICAgICAnbnVtbG9jayc6IDE0NCxcclxuICAgICAgICAnbnVtX2xvY2snOiAxNDQsXHJcbiAgICAgICAgJ251bSc6IDE0NCxcclxuXHJcbiAgICAgICAgJ3BhdXNlJzogMTksXHJcbiAgICAgICAgJ2JyZWFrJzogMTksXHJcblxyXG4gICAgICAgICdpbnNlcnQnOiA0NSxcclxuICAgICAgICAnaG9tZSc6IDM2LFxyXG4gICAgICAgICdkZWxldGUnOiA0NixcclxuICAgICAgICAnZW5kJzogMzUsXHJcblxyXG4gICAgICAgICdwYWdldXAnOiAzMyxcclxuICAgICAgICAncGFnZV91cCc6IDMzLFxyXG4gICAgICAgICdwdSc6IDMzLFxyXG5cclxuICAgICAgICAncGFnZWRvd24nOiAzNCxcclxuICAgICAgICAncGFnZV9kb3duJzogMzQsXHJcbiAgICAgICAgJ3BkJzogMzQsXHJcblxyXG4gICAgICAgICdsZWZ0JzogMzcsXHJcbiAgICAgICAgJ3VwJzogMzgsXHJcbiAgICAgICAgJ3JpZ2h0JzogMzksXHJcbiAgICAgICAgJ2Rvd24nOiA0MCxcclxuXHJcbiAgICAgICAgJ2YxJzogMTEyLFxyXG4gICAgICAgICdmMic6IDExMyxcclxuICAgICAgICAnZjMnOiAxMTQsXHJcbiAgICAgICAgJ2Y0JzogMTE1LFxyXG4gICAgICAgICdmNSc6IDExNixcclxuICAgICAgICAnZjYnOiAxMTcsXHJcbiAgICAgICAgJ2Y3JzogMTE4LFxyXG4gICAgICAgICdmOCc6IDExOSxcclxuICAgICAgICAnZjknOiAxMjAsXHJcbiAgICAgICAgJ2YxMCc6IDEyMSxcclxuICAgICAgICAnZjExJzogMTIyLFxyXG4gICAgICAgICdmMTInOiAxMjNcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBtb2RpZmllcnMgPSB7XHJcbiAgICAgICAgc2hpZnQ6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfSxcclxuICAgICAgICBjdHJsOiB7IHdhbnRlZDogZmFsc2UsIHByZXNzZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgYWx0OiB7IHdhbnRlZDogZmFsc2UsIHByZXNzZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgbWV0YTogeyB3YW50ZWQ6IGZhbHNlLCBwcmVzc2VkOiBmYWxzZSB9XHQvLyBNZXRhIGlzIE1hYyBzcGVjaWZpY1xyXG4gICAgfTtcclxuXHJcbiAgICBwdWJsaWMgZXZlbnRDYWxsYmFjazogRnVuY3Rpb247XHJcbiAgICBwdWJsaWMgdGFyZ2V0OiBhbnk7XHJcbiAgICBwdWJsaWMgZXZlbnQ6IEtleWJvYXJkRXZlbnQ7XHJcbiAgICBwdWJsaWMgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbjtcclxuICAgIHB1YmxpYyBzaG9yY3V0OiBzdHJpbmc7XHJcbiAgICBwdWJsaWMgY2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICBlbGVtZW50OiBhbnksXHJcbiAgICAgICAgc2hvcmN1dENvbWJpbmF0aW9uOiBzdHJpbmcsXHJcbiAgICAgICAgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbixcclxuICAgICAgICBjYWxsYmFjazogKGU/OiBKUXVlcnlFdmVudE9iamVjdCkgPT4gdm9pZFxyXG4gICAgKSB7XHJcbiAgICAgICAgXCJuZ0luamVjdFwiO1xyXG5cclxuICAgICAgICB0aGlzLnRhcmdldCA9IGVsZW1lbnQ7XHJcbiAgICAgICAgdGhpcy5zaG9yY3V0ID0gc2hvcmN1dENvbWJpbmF0aW9uO1xyXG4gICAgICAgIHRoaXMuZXZlbnQgPSBvcHRpb24uVHlwZTtcclxuICAgICAgICB0aGlzLm9wdGlvbiA9IG9wdGlvbjtcclxuICAgICAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XHJcblxyXG4gICAgICAgIHRoaXMuZXZlbnRDYWxsYmFjayA9IChldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHtcclxuICAgICAgICAgICAgbGV0IGU6IEpRdWVyeUV2ZW50T2JqZWN0ID0gZXZlbnQgfHwgPEpRdWVyeUV2ZW50T2JqZWN0PndpbmRvdy5ldmVudDtcclxuICAgICAgICAgICAgbGV0IGNvZGU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbi5EaXNhYmxlSW5JbnB1dCkgeyAvLyBEaXNhYmxlIHNob3J0Y3V0IGtleXMgaW4gSW5wdXQsIFRleHRhcmVhIGZpZWxkc1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZS50YXJnZXQ7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGUuc3JjRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlLnNyY0VsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQubm9kZVR5cGUgPT0gMykge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC50YWdOYW1lID09ICdJTlBVVCcgfHwgZWxlbWVudC50YWdOYW1lID09ICdURVhUQVJFQScpIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBGaW5kIFdoaWNoIGtleSBpcyBwcmVzc2VkXHJcbiAgICAgICAgICAgIGlmIChlLmtleUNvZGUpIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBlLmtleUNvZGU7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS53aGljaCkge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IGUud2hpY2g7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBjaGFyYWN0ZXIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoY29kZSA9PSAxODgpIGNoYXJhY3RlciA9IFwiLFwiOyAvLyBJZiB0aGUgdXNlciBwcmVzc2VzLCB3aGVuIHRoZSB0eXBlIGlzIG9ua2V5ZG93blxyXG4gICAgICAgICAgICBpZiAoY29kZSA9PSAxOTApIGNoYXJhY3RlciA9IFwiLlwiOyAvLyBJZiB0aGUgdXNlciBwcmVzc2VzLCB3aGVuIHRoZSB0eXBlIGlzIG9ua2V5ZG93blxyXG5cclxuICAgICAgICAgICAgbGV0IGtleXM6IHN0cmluZ1tdID0gdGhpcy5zaG9yY3V0LnNwbGl0KFwiK1wiKTtcclxuICAgICAgICAgICAgLy8gS2V5IFByZXNzZWQgLSBjb3VudHMgdGhlIG51bWJlciBvZiB2YWxpZCBrZXlwcmVzc2VzIC0gaWYgaXQgaXMgc2FtZSBhcyB0aGUgbnVtYmVyIG9mIGtleXMsIHRoZSBzaG9ydGN1dCBmdW5jdGlvbiBpcyBpbnZva2VkXHJcbiAgICAgICAgICAgIGxldCBrcDogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgICAgIGlmIChlLmN0cmxLZXkpIHRoaXMubW9kaWZpZXJzLmN0cmwucHJlc3NlZCA9IGUuY3RybEtleTtcclxuICAgICAgICAgICAgaWYgKGUuc2hpZnRLZXkpIHRoaXMubW9kaWZpZXJzLnNoaWZ0LnByZXNzZWQgPSBlLnNoaWZ0S2V5O1xyXG4gICAgICAgICAgICBpZiAoZS5hbHRLZXkpIHRoaXMubW9kaWZpZXJzLmFsdC5wcmVzc2VkID0gZS5hbHRLZXk7XHJcbiAgICAgICAgICAgIGlmIChlLm1ldGFLZXkpIHRoaXMubW9kaWZpZXJzLm1ldGEucHJlc3NlZCA9IGUubWV0YUtleTtcclxuXHJcbiAgICAgICAgICAgIGxldCBpOiBudW1iZXIgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGs6IHN0cmluZyA9IGtleXNbaV07XHJcbiAgICAgICAgICAgICAgICAvLyBNb2RpZmllcnNcclxuICAgICAgICAgICAgICAgIGlmIChrID09ICdjdHJsJyB8fCBrID09ICdjb250cm9sJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuY3RybC53YW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrID09ICdzaGlmdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLnNoaWZ0LndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsgPT0gJ2FsdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmFsdC53YW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrID09ICdtZXRhJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMubWV0YS53YW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrLmxlbmd0aCA+IDEpIHsgLy8gSWYgaXQgaXMgYSBzcGVjaWFsIGtleVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNwZWNpYWxfa2V5c1trXSA9PSBjb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbi5LZXljb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9uLktleWNvZGUgPT0gY29kZSkga3ArKztcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vIFRoZSBzcGVjaWFsIGtleXMgZGlkIG5vdCBtYXRjaFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyYWN0ZXIgPT0gaykga3ArKztcclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2hpZnRfbnVtc1tjaGFyYWN0ZXJdICYmIGUuc2hpZnRLZXkpIHsgLy8gU3R1cGlkIFNoaWZ0IGtleSBidWcgY3JlYXRlZCBieSB1c2luZyBsb3dlcmNhc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJhY3RlciA9IHRoaXMuc2hpZnRfbnVtc1tjaGFyYWN0ZXJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJhY3RlciA9PSBrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGtwID09IGtleXMubGVuZ3RoICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5jdHJsLnByZXNzZWQgPT0gdGhpcy5tb2RpZmllcnMuY3RybC53YW50ZWQgJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLnNoaWZ0LnByZXNzZWQgPT0gdGhpcy5tb2RpZmllcnMuc2hpZnQud2FudGVkICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5hbHQucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5hbHQud2FudGVkICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5tZXRhLnByZXNzZWQgPT0gdGhpcy5tb2RpZmllcnMubWV0YS53YW50ZWQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrKGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb24uUHJvcGFnYXRlKSB7IC8vIFN0b3AgdGhlIGV2ZW50XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZS5jYW5jZWxCdWJibGUgaXMgc3VwcG9ydGVkIGJ5IElFIC0gdGhpcyB3aWxsIGtpbGwgdGhlIGJ1YmJsaW5nIHByb2Nlc3MuXHJcbiAgICAgICAgICAgICAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZS5zdG9wUHJvcGFnYXRpb24gd29ya3MgaW4gRmlyZWZveC5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZS5zdG9wUHJvcGFnYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmN0cmwucHJlc3NlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5zaGlmdC5wcmVzc2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmFsdC5wcmVzc2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLm1ldGEucHJlc3NlZCA9IGZhbHNlO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHtcclxuICAgIEtleWJvYXJkU2hvcnRjdXQsXHJcbiAgICBTaG9ydGN1dE9wdGlvbixcclxuICAgIEtleWJvYXJkRXZlbnRcclxufSBmcm9tIFwiLi9LZXlib2FyZFNob3J0Y3V0XCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElLZXlib2FyZFNob3J0Y3V0cyB7XHJcbiAgICBba2V5OiBzdHJpbmddOiBLZXlib2FyZFNob3J0Y3V0XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZSB7XHJcbiAgICBhZGQoc2hvcmN1dE5hbWU6IHN0cmluZywgY2FsbGJhY2s6ICgpID0+IHZvaWQsIG9wdGlvbnM6IFNob3J0Y3V0T3B0aW9uKTogdm9pZDtcclxuICAgIHJlbW92ZShzaG9yY3V0TmFtZTogc3RyaW5nKTogdm9pZDtcclxuXHJcbiAgICBzaG9yY3V0czogSUtleWJvYXJkU2hvcnRjdXRzXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVNob3J0Y3V0c1JlZ2lzdGVyUHJvdmlkZXIgZXh0ZW5kcyBuZy5JU2VydmljZVByb3ZpZGVyIHtcclxuICAgIG9wdGlvbjogU2hvcnRjdXRPcHRpb247XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2UgaW1wbGVtZW50cyBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlIHtcclxuICAgIHByaXZhdGUgX2xvZzogbmcuSUxvZ1NlcnZpY2U7XHJcbiAgICBwcml2YXRlIF9kZWZhdWx0T3B0aW9uOiBTaG9ydGN1dE9wdGlvbjtcclxuICAgIHByaXZhdGUgX3Nob3J0Y3V0czogSUtleWJvYXJkU2hvcnRjdXRzO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICAkbG9nOiBuZy5JTG9nU2VydmljZSxcclxuICAgICAgICBvcHRpb246IFNob3J0Y3V0T3B0aW9uXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcbiAgICAgICAgdGhpcy5fbG9nID0gJGxvZztcclxuICAgICAgICB0aGlzLl9kZWZhdWx0T3B0aW9uID0gb3B0aW9uID8gXy5kZWZhdWx0cyhvcHRpb24sIHRoaXMuZ2V0RGVmYXVsdE9wdGlvbigpKSA6IHRoaXMuZ2V0RGVmYXVsdE9wdGlvbigpO1xyXG5cclxuICAgICAgICB0aGlzLl9zaG9ydGN1dHMgPSB7fTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldERlZmF1bHRPcHRpb24oKTogU2hvcnRjdXRPcHRpb24ge1xyXG4gICAgICAgIGxldCBkZWZhdWx0T3B0aW9uOiBTaG9ydGN1dE9wdGlvbiA9IHtcclxuICAgICAgICAgICAgVHlwZTogS2V5Ym9hcmRFdmVudC5LZXlkb3duLFxyXG4gICAgICAgICAgICBQcm9wYWdhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBEaXNhYmxlSW5JbnB1dDogZmFsc2UsXHJcbiAgICAgICAgICAgIFRhcmdldDogZG9jdW1lbnQsXHJcbiAgICAgICAgICAgIEtleWNvZGU6IG51bGxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gZGVmYXVsdE9wdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNoZWNrQWRkU2hvcnRjdXQoZWxlbWVudDogYW55LCBzaG9yY3V0Q29tYmluYXRpb246IHN0cmluZywgY2FsbGJhY2s6IChlOiBKUXVlcnlFdmVudE9iamVjdCkgPT4gdm9pZCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmICghZWxlbWVudCkge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1JlZ2lzdGVyIHNob3J0Y3V0OiBlbGVtZW50IHVuZGVudGlmaWVkIScpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFzaG9yY3V0Q29tYmluYXRpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5fbG9nLmVycm9yKCdSZWdpc3RlciBzaG9ydGN1dDogc2hvcmN1dCBjb21iaW5hdGlvbiB1bmRlbnRpZmllZCEnKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgdGhpcy5fbG9nLmVycm9yKCdSZWdpc3RlciBzaG9ydGN1dDogc2hvcmN1dCBjYWxsYmFjayB1bmRlbnRpZmllZCEnKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgc2hvcmN1dHMoKTogSUtleWJvYXJkU2hvcnRjdXRzIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhZGQoc2hvcmN1dE5hbWU6IHN0cmluZywgY2FsbGJhY2s6IChlOiBKUXVlcnlFdmVudE9iamVjdCkgPT4gdm9pZCwgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbik6IHZvaWQge1xyXG4gICAgICAgIHRoaXMucmVtb3ZlKHNob3JjdXROYW1lKTtcclxuICAgICAgICBsZXQgc2hvcmN1dE9wdGlvbjogU2hvcnRjdXRPcHRpb24gPSBvcHRpb24gPyBfLmRlZmF1bHRzKG9wdGlvbiwgdGhpcy5fZGVmYXVsdE9wdGlvbikgOiB0aGlzLl9kZWZhdWx0T3B0aW9uO1xyXG4gICAgICAgIGxldCBzaG9yY3V0Q29tYmluYXRpb246IHN0cmluZyA9IHNob3JjdXROYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgbGV0IGVsZW1lbnQgPSBzaG9yY3V0T3B0aW9uLlRhcmdldDtcclxuXHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygc2hvcmN1dE9wdGlvbi5UYXJnZXQgPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNob3JjdXRPcHRpb24uVGFyZ2V0KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gc2hvcmN1dE9wdGlvbi5UYXJnZXQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRoaXMuY2hlY2tBZGRTaG9ydGN1dChlbGVtZW50LCBzaG9yY3V0Q29tYmluYXRpb24sIGNhbGxiYWNrKSkge1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbmV3S2V5Ym9hcmRTaG9ydGN1dCA9IG5ldyBLZXlib2FyZFNob3J0Y3V0KGVsZW1lbnQsIHNob3JjdXRDb21iaW5hdGlvbiwgc2hvcmN1dE9wdGlvbiwgY2FsbGJhY2spO1xyXG5cclxuICAgICAgICB0aGlzLl9zaG9ydGN1dHNbc2hvcmN1dENvbWJpbmF0aW9uXSA9IG5ld0tleWJvYXJkU2hvcnRjdXQ7XHJcblxyXG4gICAgICAgIC8vQXR0YWNoIHRoZSBmdW5jdGlvbiB3aXRoIHRoZSBldmVudFxyXG4gICAgICAgIGlmIChlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHNob3JjdXRPcHRpb24uVHlwZSwgbmV3S2V5Ym9hcmRTaG9ydGN1dC5ldmVudENhbGxiYWNrLCBmYWxzZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChlbGVtZW50LmF0dGFjaEV2ZW50KSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuYXR0YWNoRXZlbnQoJ29uJyArIHNob3JjdXRPcHRpb24uVHlwZSwgbmV3S2V5Ym9hcmRTaG9ydGN1dC5ldmVudENhbGxiYWNrKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlbGVtZW50Lm9uKHNob3JjdXRPcHRpb24uVHlwZSwgbmV3S2V5Ym9hcmRTaG9ydGN1dC5ldmVudENhbGxiYWNrKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHJlbW92ZShzaG9yY3V0TmFtZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IHNob3J0Y3V0Q29tYmluYXRpb24gPSBzaG9yY3V0TmFtZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgIGxldCBiaW5kaW5nOiBLZXlib2FyZFNob3J0Y3V0ID0gdGhpcy5fc2hvcnRjdXRzW3Nob3J0Y3V0Q29tYmluYXRpb25dO1xyXG5cclxuICAgICAgICBkZWxldGUodGhpcy5fc2hvcnRjdXRzW3Nob3J0Y3V0Q29tYmluYXRpb25dKVxyXG4gICAgICAgIGlmICghYmluZGluZykgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgdHlwZSA9IGJpbmRpbmcuZXZlbnQ7XHJcbiAgICAgICAgbGV0IGVsZW1lbnQgPSBiaW5kaW5nLnRhcmdldDtcclxuICAgICAgICBsZXQgY2FsbGJhY2sgPSBiaW5kaW5nLmV2ZW50Q2FsbGJhY2s7XHJcblxyXG4gICAgICAgIGlmIChlbGVtZW50LmRldGFjaEV2ZW50KSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuZGV0YWNoRXZlbnQoJ29uJyArIHR5cGUsIGNhbGxiYWNrKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xyXG4gICAgICAgICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBlbGVtZW50WydvbicgKyB0eXBlXSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBlbGVtZW50Lm9mZih0eXBlLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG57XHJcbiAgICBjbGFzcyBTaG9ydGN1dHNSZWdpc3RlclByb3ZpZGVyIGltcGxlbWVudHMgSVNob3J0Y3V0c1JlZ2lzdGVyUHJvdmlkZXIge1xyXG4gICAgICAgIHByaXZhdGUgX3NlcnZpY2U6IFNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZTtcclxuICAgICAgICBwcml2YXRlIF9vcHRpb246IFNob3J0Y3V0T3B0aW9uO1xyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0IG9wdGlvbigpOiBTaG9ydGN1dE9wdGlvbiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0IG9wdGlvbih2YWx1ZTogU2hvcnRjdXRPcHRpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5fb3B0aW9uID0gdmFsdWUgfHwgbmV3IFNob3J0Y3V0T3B0aW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgJGdldChcclxuICAgICAgICAgICAgJGxvZzogbmcuSUxvZ1NlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgXCJuZ0luamVjdFwiO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuX3NlcnZpY2UgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRoaXMuX3NlcnZpY2UgPSBuZXcgU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlKCRsb2csIHRoaXMuX29wdGlvbik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2VydmljZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoJ3BpcFNob3J0Y3V0cycpXHJcbiAgICAgICAgLnByb3ZpZGVyKCdwaXBTaG9ydGN1dHNSZWdpc3RlcicsIFNob3J0Y3V0c1JlZ2lzdGVyUHJvdmlkZXIpO1xyXG59IiwiaW1wb3J0ICB7XHJcbiAgICBTaG9ydGN1dE9wdGlvbixcclxufSBmcm9tIFwiLi9LZXlib2FyZFNob3J0Y3V0XCI7XHJcblxyXG5pbXBvcnQgIHtcclxuICAgIElTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2UsXHJcbn0gZnJvbSBcIi4vU2hvcmN1dHNSZWdpc3RlclNlcnZpY2VcIjtcclxuXHJcbmludGVyZmFjZSBTaG9ydGN1dEF0dHJpYnV0ZXMgZXh0ZW5kcyBuZy5JQXR0cmlidXRlcyB7XHJcbiAgICBwaXBTaG9ydGN1dEFjdGlvbjogYW55O1xyXG4gICAgcGlwU2hvcnRjdXROYW1lOiBhbnk7XHJcbiAgICBwaXBTaG9yY3V0T3B0aW9uczogU2hvcnRjdXRPcHRpb247XHJcbn1cclxuXHJcbmNsYXNzIFNob3J0Y3V0Q29udHJvbGxlciBpbXBsZW1lbnRzIG5nLklDb250cm9sbGVyICB7XHJcbiAgICBwcml2YXRlIGFjdGlvblNob3J0Y3V0czogRnVuY3Rpb247XHJcbiAgICBwcml2YXRlIG5hbWVTaG9ydGN1dHM6IHN0cmluZztcclxuICAgIHByaXZhdGUgb3B0aW9uczogU2hvcnRjdXRPcHRpb247XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAkYXR0cnM6IFNob3J0Y3V0QXR0cmlidXRlcyxcclxuICAgICAgICAkc2NvcGU6IG5nLklTY29wZSxcclxuICAgICAgICAkbG9nOiBuZy5JTG9nU2VydmljZSxcclxuICAgICAgICAkcGFyc2U6IG5nLklQYXJzZVNlcnZpY2UsXHJcbiAgICAgICAgcGlwU2hvcnRjdXRzUmVnaXN0ZXI6IElTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2VcclxuICAgICkge1xyXG4gICAgICAgIFwibmdJbmplY3RcIjtcclxuXHJcbiAgICAgICAgaWYgKCRhdHRycy5waXBTaG9ydGN1dEFjdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLmFjdGlvblNob3J0Y3V0cyA9ICRwYXJzZSgkYXR0cnMucGlwU2hvcnRjdXRBY3Rpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmFjdGlvblNob3J0Y3V0cygkc2NvcGUsIHskZXZlbnQ6IHt9fSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgJGxvZy5lcnJvcignU2hvcmN1bnQgYWN0aW9uIGRvZXMgbm90IHNldC4nKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCRhdHRycy5waXBTaG9ydGN1dE5hbWUgJiYgXy5pc1N0cmluZygkYXR0cnMucGlwU2hvcnRjdXROYW1lKSkge1xyXG4gICAgICAgICAgICB0aGlzLm5hbWVTaG9ydGN1dHMgPSAkYXR0cnMucGlwU2hvcnRjdXROYW1lO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICRsb2cuZXJyb3IoJ1Nob3JjdW50IG5hbWUgZG9lcyBub3Qgc2V0LicpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm9wdGlvbnMgPSAkYXR0cnMucGlwU2hvcmN1dE9wdGlvbnMgPyA8U2hvcnRjdXRPcHRpb24+JGF0dHJzLnBpcFNob3JjdXRPcHRpb25zIDogPFNob3J0Y3V0T3B0aW9uPnt9O1xyXG4gICAgICAgIHRoaXMub3B0aW9ucy5UYXJnZXQgPSAkZWxlbWVudDtcclxuICAgICAgICAvLyBSZWdpc3RyYXRpb24gb2Yga2V5Ym9yZCBzaG9ydGN1dHNcclxuICAgICAgICBwaXBTaG9ydGN1dHNSZWdpc3Rlci5hZGQodGhpcy5uYW1lU2hvcnRjdXRzLCAoZT86IGFueSkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmFjdGlvblNob3J0Y3V0cygkc2NvcGUsIHskZXZlbnQ6IHsnZSc6IGV9fSk7ICAgICAgICAgIFxyXG4gICAgICAgIH0sIHRoaXMub3B0aW9ucyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBrZXlwcmVzc1Nob3J0Y3V0KGFjdGlvbikge1xyXG4gICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIFByZXZlbnQganVuayBmcm9tIGdvaW5nIGludG8gdHlwZXNjcmlwdCBkZWZpbml0aW9uc1xyXG57XHJcbiAgICBjb25zdCBzaG9ydGN1dHNEaXJlY3RpdmUgPSBmdW5jdGlvbigpOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IFNob3J0Y3V0Q29udHJvbGxlclxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoJ3BpcFNob3J0Y3V0cycpXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwU2hvcnRjdXQnLCBzaG9ydGN1dHNEaXJlY3RpdmUpO1xyXG59IiwiaW1wb3J0IHtcclxuICAgIElTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2VcclxufSBmcm9tIFwiLi9TaG9yY3V0c1JlZ2lzdGVyU2VydmljZVwiXHJcbmltcG9ydCAge1xyXG4gICAgS2V5Ym9hcmRTaG9ydGN1dCxcclxuICAgIFNob3J0Y3V0T3B0aW9uLFxyXG4gICAgS2V5Ym9hcmRFdmVudFxyXG59IGZyb20gXCIuL0tleWJvYXJkU2hvcnRjdXRcIjtcclxuXHJcbmV4cG9ydCBsZXQgU2hvcnRjdXRzQ2hhbmdlZEV2ZW50ID0gJ3BpcFNob3J0Y3V0c0NoYW5nZWQnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNob3J0Y3V0SXRlbSB7XHJcbiAgICAvLyBTaG9ydGN1dCBjb21iaW5hdGlvblxyXG4gICAgcHVibGljIHNob3J0Y3V0OiBzdHJpbmc7XHJcbiAgICAvLyBUYXJnZXQgb2JqZWN0IFxyXG4gICAgcHVibGljIHRhcmdldD86IGFueTtcclxuICAgIC8vIFRhcmdldCBlbGVtZW50IGJ5IElkXHJcbiAgICBwdWJsaWMgdGFyZ2V0SWQ/OiBzdHJpbmc7XHJcbiAgICAvLyBUYXJnZXQgZWxlbWVudCBieSBjbGFzcyAoZmlyc3RlbGVtZW50Pz8pXHJcbiAgICAvLyBQdWJsaWMgdGFyZ2V0Q2xhc3M/OiBzdHJpbmc7XHJcbiAgICAvLyBBY2Nlc3MgZnVuY3Rpb25cclxuICAgIHB1YmxpYyBhY2Nlc3M/OiAoZXZlbnQ6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiBib29sZWFuO1xyXG4gICAgLy8gV2luZG93LmxvY2F0aW9uLmhyZWZcclxuICAgIHB1YmxpYyBocmVmPzogc3RyaW5nO1xyXG4gICAgLy8gJGxvY2F0aW9uLnVybFxyXG4gICAgcHVibGljIHVybD86IHN0cmluZztcclxuICAgIC8vICRzdGF0ZS5nbyhzdGF0ZSwgc3RhdGVQYXJhbXMpXHJcbiAgICBwdWJsaWMgc3RhdGU/OiBzdHJpbmc7XHJcbiAgICAvLyBQYXJhbWV0ZXJzIGZvciAkc3RhdGUuZ28oc3RhdGUsIHN0YXRlUGFyYW1zKVxyXG4gICAgcHVibGljIHN0YXRlUGFyYW1zPzogYW55O1xyXG4gICAgLy8gJHJvb3RTY29wZS5icm9hZGNhc3QoZXZlbnQpXHJcbiAgICBwdWJsaWMgZXZlbnQ/OiBzdHJpbmc7XHJcbiAgICAvLyBDbGljayBjYWxsYmFja1xyXG4gICAgcHVibGljIGtleXByZXNzPzogKGV2ZW50OiBKUXVlcnlFdmVudE9iamVjdCkgPT4gdm9pZDtcclxuICAgIC8vIERlZmF1bHQgb3B0aW9uc1xyXG4gICAgcHVibGljIG9wdGlvbnM/OiBTaG9ydGN1dE9wdGlvbjsgICAgXHJcbn1cclxuXHJcbi8vIGV4cG9ydCBjbGFzcyBTaG9ydGN1dEl0ZW0gZXh0ZW5kcyBTaW1wbGVTaG9ydGN1dEl0ZW0ge1xyXG4vLyAgICAgcHVibGljIHNob3J0Y3V0czogU2ltcGxlU2hvcnRjdXRJdGVtW107XHJcbi8vIH1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dHNDb25maWcge1xyXG4gICAgLy8gR2xvYmFsIHNob3J0Y3V0IFxyXG4gICAgcHVibGljIGdsb2JhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW10gPSBbXTtcclxuICAgIC8vIExvY2FsIHNob3J0Y3V0IFxyXG4gICAgcHVibGljIGxvY2FsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXSA9IFtdO1xyXG4gICAgLy8gRGVmYXVsdCBvcHRpb25zXHJcbiAgICBwdWJsaWMgZGVmYXVsdE9wdGlvbnM6IFNob3J0Y3V0T3B0aW9uID0gbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzU2VydmljZSB7XHJcbiAgICByZWFkb25seSBjb25maWc6IFNob3J0Y3V0c0NvbmZpZztcclxuXHJcbiAgICBnbG9iYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG4gICAgbG9jYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG5cclxuICAgIG9uKGdsb2JhbFNob3J0Y3V0cz86IFNob3J0Y3V0SXRlbVtdLCBsb2NhbFNob3J0Y3V0cz86IFNob3J0Y3V0SXRlbVtdKTogdm9pZDtcclxuICAgIG9uTG9jYWwobG9jYWxTaG9ydGN1dHM/OiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQ7XHJcbiAgICBvZmYoKTogdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzUHJvdmlkZXIgZXh0ZW5kcyBuZy5JU2VydmljZVByb3ZpZGVyIHtcclxuICAgIGNvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG4gICAgXHJcbiAgICBnbG9iYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG4gICAgbG9jYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG4gICAgZGVmYXVsdE9wdGlvbnM6IFNob3J0Y3V0T3B0aW9uO1xyXG59XHJcblxyXG5jbGFzcyBTaG9ydGN1dHNTZXJ2aWNlIGltcGxlbWVudHMgSVNob3J0Y3V0c1NlcnZpY2Uge1xyXG4gICAgcHJpdmF0ZSBfb2xkQ29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcbiAgICBwcml2YXRlIF9jb25maWc6IFNob3J0Y3V0c0NvbmZpZztcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3IoXHJcbiAgICAgICAgY29uZmlnOiBTaG9ydGN1dHNDb25maWcsXHJcbiAgICAgICAgcHJpdmF0ZSAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSxcclxuICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLCBcclxuICAgICAgICBwcml2YXRlICRsb2NhdGlvbjogbmcuSUxvY2F0aW9uU2VydmljZSwgXHJcbiAgICAgICAgcHJpdmF0ZSAkaW5qZWN0b3I6IG5nLmF1dG8uSUluamVjdG9yU2VydmljZSxcclxuICAgICAgICBwcml2YXRlIHBpcFNob3J0Y3V0c1JlZ2lzdGVyOiBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICB0aGlzLl9jb25maWcgPSB0aGlzLmNvbmZpZztcclxuICAgICAgICB0aGlzLl9vbGRDb25maWcgPSBfLmNsb25lRGVlcCh0aGlzLmNvbmZpZyk7XHJcblxyXG4gICAgICAgIC8vIEFkZCBzaG9ydGN1dHNcclxuICAgICAgICB0aGlzLmFkZFNob3J0Y3V0cyh0aGlzLmNvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuY29uZmlnLmxvY2FsU2hvcnRjdXRzKTsgICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIC8vIERlc2NyaWJlIHByaXZhdGUgZnVuY3Rpb25zXHJcbiAgICBwcml2YXRlIHNlbmRDaGFuZ2VFdmVudCgpIHtcclxuICAgICAgICAvLyBSZW1vdmUgc2hvcnRjdXRzXHJcbiAgICAgICAgdGhpcy5yZW1vdmVTaG9ydGN1dHModGhpcy5fb2xkQ29uZmlnLmdsb2JhbFNob3J0Y3V0cyk7XHJcbiAgICAgICAgdGhpcy5yZW1vdmVTaG9ydGN1dHModGhpcy5fb2xkQ29uZmlnLmxvY2FsU2hvcnRjdXRzKTtcclxuICAgICAgICAvLyBBZGQgc2hvcnRjdXRzXHJcbiAgICAgICAgdGhpcy5hZGRTaG9ydGN1dHModGhpcy5jb25maWcuZ2xvYmFsU2hvcnRjdXRzKTtcclxuICAgICAgICB0aGlzLmFkZFNob3J0Y3V0cyh0aGlzLmNvbmZpZy5sb2NhbFNob3J0Y3V0cyk7XHJcblxyXG4gICAgICAgIHRoaXMuJHJvb3RTY29wZS4kZW1pdChTaG9ydGN1dHNDaGFuZ2VkRXZlbnQsIHRoaXMuY29uZmlnKTtcclxuICAgICAgICAvLyBTYXZlIGN1cnJlbnQgY29uZmlnIHRvIG9sZENvbmZpZ1xyXG4gICAgICAgIHRoaXMuX29sZENvbmZpZyA9IF8uY2xvbmVEZWVwKHRoaXMuY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZVNob3J0Y3V0cyhjb2xsZWN0aW9uOiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQge1xyXG4gICAgICAgIF8uZWFjaChjb2xsZWN0aW9uLCAoaykgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBpcFNob3J0Y3V0c1JlZ2lzdGVyLnJlbW92ZShrLnNob3J0Y3V0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGtleXByZXNzU2hvcnRjdXQoc2hvcmN1dDogU2hvcnRjdXRJdGVtLCBldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpIHtcclxuICAgICAgICBpZiAoc2hvcmN1dC5hY2Nlc3MgJiYgXy5pc0Z1bmN0aW9uKHNob3JjdXQuYWNjZXNzKSkge1xyXG4gICAgICAgICAgICBpZiAoIXNob3JjdXQuYWNjZXNzKGV2ZW50KSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBcclxuXHJcbiAgICAgICAgaWYgKHNob3JjdXQua2V5cHJlc3MpIHtcclxuICAgICAgICAgICAgc2hvcmN1dC5rZXlwcmVzcyhldmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzaG9yY3V0LmhyZWYpIHtcclxuICAgICAgICAgICAgdGhpcy4kd2luZG93LmxvY2F0aW9uLmhyZWYgPSBzaG9yY3V0LmhyZWY7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzaG9yY3V0LnVybCkge1xyXG4gICAgICAgICAgICB0aGlzLiRsb2NhdGlvbi51cmwoc2hvcmN1dC51cmwpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2hvcmN1dC5zdGF0ZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kaW5qZWN0b3IuaGFzKCckc3RhdGUnKSkge1xyXG4gICAgICAgICAgICAgICAgdmFyICRzdGF0ZSA9IHRoaXMuJGluamVjdG9yLmdldCgnJHN0YXRlJyk7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGVbJ2dvJ10oc2hvcmN1dC5zdGF0ZSwgc2hvcmN1dC5zdGF0ZVBhcmFtcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNob3JjdXQuZXZlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3Qoc2hvcmN1dC5ldmVudCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIHJhaXNlIG5vdGlmaWNhdGlvblxyXG4gICAgICAgICAgICB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgncGlwU2hvcnRjdXRLZXlwcmVzcycsIHNob3JjdXQuc2hvcnRjdXQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFkZFNob3J0Y3V0cyhjb2xsZWN0aW9uOiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQge1xyXG4gICAgICAgIGxldCBnZW5lcmFsT3B0aW9uczogU2hvcnRjdXRPcHRpb24gPSB0aGlzLmNvbmZpZy5kZWZhdWx0T3B0aW9ucyA/IHRoaXMuY29uZmlnLmRlZmF1bHRPcHRpb25zIDogPFNob3J0Y3V0T3B0aW9uPnt9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIF8uZWFjaChjb2xsZWN0aW9uLCAoaykgPT4ge1xyXG4gICAgICAgICAgICBsZXQgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbiA9IGsub3B0aW9ucyA/IGsub3B0aW9ucyA6IGdlbmVyYWxPcHRpb25zO1xyXG4gICAgICAgICAgICBsZXQgdGFyZ2V0OiBhbnk7XHJcblxyXG4gICAgICAgICAgICB0YXJnZXQgPSBrLnRhcmdldCA/IGsudGFyZ2V0IDogay50YXJnZXRJZDtcclxuICAgICAgICAgICAgb3B0aW9uLlRhcmdldCA9IHRhcmdldDtcclxuICAgICAgICAgICAgLy8gUmVnaXN0cmF0aW9uIG9mIGtleWJvYXJkIHNob3J0Y3V0XHJcbiAgICAgICAgICAgIHRoaXMucGlwU2hvcnRjdXRzUmVnaXN0ZXIuYWRkKGsuc2hvcnRjdXQsIChlPzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmtleXByZXNzU2hvcnRjdXQoaywgZSk7ICAgICAgICBcclxuICAgICAgICAgICAgfSwgb3B0aW9uKTsgICAgICAgICAgICAgIFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERlc2NyaWJlIHB1YmxpYyBmdW5jdGlvbnMgXHJcbiAgICBwdWJsaWMgZ2V0IGNvbmZpZygpOiBTaG9ydGN1dHNDb25maWcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWc7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBkZWZhdWx0T3B0aW9ucygpOiBTaG9ydGN1dE9wdGlvbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5kZWZhdWx0T3B0aW9ucztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGRlZmF1bHRPcHRpb25zKHZhbHVlOiBTaG9ydGN1dE9wdGlvbikge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5kZWZhdWx0T3B0aW9ucyA9IHZhbHVlIHx8IG51bGw7XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGdsb2JhbFNob3J0Y3V0cygpOiBTaG9ydGN1dEl0ZW1bXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBnbG9iYWxTaG9ydGN1dHModmFsdWU6IFNob3J0Y3V0SXRlbVtdKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cyA9IHZhbHVlIHx8IFtdO1xyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBsb2NhbFNob3J0Y3V0cygpOiBTaG9ydGN1dEl0ZW1bXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGxvY2FsU2hvcnRjdXRzKHZhbHVlOiBTaG9ydGN1dEl0ZW1bXSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyA9IHZhbHVlIHx8IFtdO1xyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9uKGdsb2JhbFNob3J0Y3V0cz86IFNob3J0Y3V0SXRlbVtdLCBsb2NhbFNob3J0Y3V0cz86IFNob3J0Y3V0SXRlbVtdKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKGdsb2JhbFNob3J0Y3V0cyAmJiBfLmlzQXJyYXkoZ2xvYmFsU2hvcnRjdXRzKSkge1xyXG4gICAgICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gZ2xvYmFsU2hvcnRjdXRzOyAgICBcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGxvY2FsU2hvcnRjdXRzICYmIF8uaXNBcnJheShsb2NhbFNob3J0Y3V0cykpIHtcclxuICAgICAgICAgICAgdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzID0gbG9jYWxTaG9ydGN1dHM7ICAgIFxyXG4gICAgICAgIH0gICAgICAgIFxyXG5cclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbkxvY2FsKGxvY2FsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10pOiB2b2lkIHtcclxuICAgICAgICBpZiAobG9jYWxTaG9ydGN1dHMgJiYgXy5pc0FycmF5KGxvY2FsU2hvcnRjdXRzKSkge1xyXG4gICAgICAgICAgICB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHMgPSBsb2NhbFNob3J0Y3V0czsgICAgXHJcbiAgICAgICAgfSAgICAgICAgXHJcblxyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9mZigpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gW107XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzID0gW107XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU2hvcnRjdXRzUHJvdmlkZXIgaW1wbGVtZW50cyBJU2hvcnRjdXRzUHJvdmlkZXIge1xyXG4gICAgcHJpdmF0ZSBfY29uZmlnOiBTaG9ydGN1dHNDb25maWcgPSBuZXcgU2hvcnRjdXRzQ29uZmlnKCk7XHJcbiAgICBwcml2YXRlIF9zZXJ2aWNlOiBTaG9ydGN1dHNTZXJ2aWNlO1xyXG5cclxuICAgIHB1YmxpYyBnZXQgY29uZmlnKCk6IFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGNvbmZpZyh2YWx1ZTogU2hvcnRjdXRzQ29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnID0gdmFsdWUgfHwgbmV3IFNob3J0Y3V0c0NvbmZpZygpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZGVmYXVsdE9wdGlvbnMoKTogU2hvcnRjdXRPcHRpb24ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBkZWZhdWx0T3B0aW9ucyh2YWx1ZTogU2hvcnRjdXRPcHRpb24pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnMgPSB2YWx1ZSB8fCBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZ2xvYmFsU2hvcnRjdXRzKCk6IFNob3J0Y3V0SXRlbVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGdsb2JhbFNob3J0Y3V0cyh2YWx1ZTogU2hvcnRjdXRJdGVtW10pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gdmFsdWUgfHwgW107XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBsb2NhbFNob3J0Y3V0cygpOiBTaG9ydGN1dEl0ZW1bXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGxvY2FsU2hvcnRjdXRzKHZhbHVlOiBTaG9ydGN1dEl0ZW1bXSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyA9IHZhbHVlIHx8IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyAkZ2V0KFxyXG4gICAgICAgICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLCBcclxuICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSwgXHJcbiAgICAgICAgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLCBcclxuICAgICAgICAkaW5qZWN0b3I6IG5nLmF1dG8uSUluamVjdG9yU2VydmljZSxcclxuICAgICAgICBwaXBTaG9ydGN1dHNSZWdpc3RlcjogSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZVxyXG4gICAgKSB7XHJcbiAgICAgICAgXCJuZ0luamVjdFwiO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fc2VydmljZSA9PSBudWxsKVxyXG4gICAgICAgICAgICB0aGlzLl9zZXJ2aWNlID0gbmV3IFNob3J0Y3V0c1NlcnZpY2UodGhpcy5fY29uZmlnLCAkcm9vdFNjb3BlLCAkd2luZG93LCAkbG9jYXRpb24sICRpbmplY3RvciwgcGlwU2hvcnRjdXRzUmVnaXN0ZXIpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9zZXJ2aWNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5hbmd1bGFyXHJcbiAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgLnByb3ZpZGVyKCdwaXBTaG9ydGN1dHMnLCBTaG9ydGN1dHNQcm92aWRlcik7XHJcblxyXG4iLCJhbmd1bGFyLm1vZHVsZSgncGlwU2hvcnRjdXRzJywgWyduZ01hdGVyaWFsJywgJ3VpLnJvdXRlciddKTtcclxuXHJcbmltcG9ydCAnLi9TaG9yY3V0c1JlZ2lzdGVyU2VydmljZSc7XHJcbmltcG9ydCAnLi9TaG9ydGN1dHNTZXJ2aWNlJztcclxuaW1wb3J0ICcuL1Nob3J0Y3V0RGlyZWN0aXZlJztcclxuXHJcbmV4cG9ydCAqIGZyb20gJy4vU2hvcnRjdXRzU2VydmljZSc7XHJcbmV4cG9ydCAqIGZyb20gJy4vU2hvcmN1dHNSZWdpc3RlclNlcnZpY2UnOyIsIntcclxuXHJcbiAgICBpbnRlcmZhY2UgU2VsZWN0ZWRBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIHBpcFNlbGVjdGVkOiBhbnk7XHJcbiAgICAgICAgcGlwU2VsZWN0ZWRJZDogYW55O1xyXG4gICAgICAgIHBpcFNlbGVjdDogYW55O1xyXG4gICAgICAgIHBpcEVudGVyU3BhY2VQcmVzczogYW55O1xyXG4gICAgICAgIHBpcE5vU2Nyb2xsOiBhbnk7XHJcbiAgICAgICAgcGlwU2tpcEhpZGRlbjogYW55O1xyXG4gICAgICAgIHBpcFRyZWVMaXN0OiBhbnk7XHJcbiAgICAgICAgcGlwU2VsZWN0ZWRXYXRjaDogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIFNlbGVjdGVkTGluayB7XHJcbiAgICAgICAgcHJpdmF0ZSBpbmRleEdldHRlcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgaW5kZXhTZXR0ZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIGlkU2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBpZEdldHRlcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgY2hhbmdlR2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBlbnRlclNwYWNlR2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBub1Njcm9sbDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgbW9kaWZpZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIGNsYXNzTmFtZTogYW55O1xyXG4gICAgICAgIHByaXZhdGUgc2VsZWN0ZWRJbmRleDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudEVsZW1lbnRUYWJpbmV4OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBwaXBTZWxlY3RlZFdhdGNoOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBpc1Njcm9sbGVkOiBhbnk7XHJcbiAgICAgICAgLy8gVmFyaWFibGVzIGZvciB0b3VjaCBmdW5jdGlvbnNcclxuICAgICAgICBwcml2YXRlIHRvdWNoU3RhcnRYOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSB0b3VjaFN0YXJ0WTogYW55O1xyXG4gICAgICAgIHByaXZhdGUgdHJhY2tpbmdDbGljazogYW55O1xyXG4gICAgICAgIHByaXZhdGUgdHJhY2tpbmdDbGlja1N0YXJ0OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSB0YXJnZXRFbGVtZW50OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBsYXN0Q2xpY2tUaW1lOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBjYW5jZWxOZXh0Q2xpY2s6IGFueTtcclxuICAgICAgICAvLyBDb25zdGFudHMgZm9yIHRvdWNoIGZ1bmN0aW9uc1xyXG4gICAgICAgIHByaXZhdGUgdG91Y2hCb3VuZGFyeTogbnVtYmVyID0gMTA7XHJcbiAgICAgICAgcHJpdmF0ZSB0YXBkZWxheTogbnVtYmVyID0gMjAwO1xyXG4gICAgICAgIHByaXZhdGUgdGFwVGltZW91dDogbnVtYmVyID0gNzAwO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgJHBhcnNlOiBuZy5JUGFyc2VTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRtZENvbnN0YW50OiBhbnksXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICBwcml2YXRlICRhdHRyczogU2VsZWN0ZWRBdHRyaWJ1dGVzXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5kZXhHZXR0ZXIgPSAkYXR0cnMucGlwU2VsZWN0ZWQgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdGVkKSA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuaW5kZXhTZXR0ZXIgPSB0aGlzLmluZGV4R2V0dGVyID8gdGhpcy5pbmRleEdldHRlci5hc3NpZ24gOiBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmlkR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdGVkSWQgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdGVkSWQpIDogbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5pZFNldHRlciA9IHRoaXMuaWRHZXR0ZXIgPyB0aGlzLmlkR2V0dGVyLmFzc2lnbiA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0KSA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuZW50ZXJTcGFjZUdldHRlciA9ICRhdHRycy5waXBFbnRlclNwYWNlUHJlc3MgPyAkcGFyc2UoJGF0dHJzLnBpcEVudGVyU3BhY2VQcmVzcykgOiBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLm5vU2Nyb2xsID0gJGF0dHJzLnBpcE5vU2Nyb2xsO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVyID0gJGF0dHJzLnBpcFNraXBIaWRkZW4gPyAnOnZpc2libGUnIDogJyc7XHJcbiAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJGF0dHJzLnBpcFRyZWVMaXN0ID8gJy5waXAtc2VsZWN0YWJsZS10cmVlJyA6ICcucGlwLXNlbGVjdGFibGUnO1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSB0aGlzLmluZGV4R2V0dGVyKCRzY29wZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEVsZW1lbnRUYWJpbmV4ID0gJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnKTtcclxuICAgICAgICAgICAgdGhpcy5waXBTZWxlY3RlZFdhdGNoID0gJGF0dHJzLnBpcFNlbGVjdGVkV2F0Y2g7XHJcbiAgICAgICAgICAgIHRoaXMuaXNTY3JvbGxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCB0aGlzLmN1cnJlbnRFbGVtZW50VGFiaW5leCB8fCAwKTtcclxuXHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCdjbGljaycsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25DbGlja0V2ZW50KGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCd0b3VjaHN0YXJ0JywgdGhpcy5jbGFzc05hbWUsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vblRvdWNoU3RhcnQoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNobW92ZScsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Ub3VjaE1vdmUoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNoZW5kJywgdGhpcy5jbGFzc05hbWUsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vblRvdWNoRW5kKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCd0b3VjaGNhbmNlbCcsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Ub3VjaENhbmNlbChldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkZWxlbWVudC5vbigna2V5ZG93bicsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbktleURvd24oZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2ZvY3VzaW4nLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Gb2N1c0luKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c291dCcsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkZvY3VzT3V0KGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBXYXRjaCBzZWxlY3RlZCBpdGVtIGluZGV4XHJcbiAgICAgICAgICAgIGlmICghJGF0dHJzLnBpcFRyZWVMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKHRoaXMuaW5kZXhHZXR0ZXIsIChuZXdTZWxlY3RlZEluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4OiBuZXdTZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2godGhpcy5pZEdldHRlciwgKG5ld1NlbGVjdGVkSWQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtSWQ6IG5ld1NlbGVjdGVkSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFdhdGNoIHJlc3luYyBzZWxlY3Rpb25cclxuICAgICAgICAgICAgaWYgKHRoaXMucGlwU2VsZWN0ZWRXYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCh0aGlzLnBpcFNlbGVjdGVkV2F0Y2gsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBEZWxheSB1cGRhdGUgdG8gYWxsb3cgbmctcmVwZWF0IHRvIHVwZGF0ZSBET01cclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IHRoaXMuaW5kZXhHZXR0ZXIoJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogdGhpcy5zZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gU2VsZWN0IGl0ZW0gZGVmaW5lZCBieSBpbmRleFxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgaXRlbUluZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICBpdGVtczogJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHNlbGVjdEl0ZW0oaXRlbVBhcmFtcykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc1Njcm9sbGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIGxldCBpdGVtSW5kZXggPSBpdGVtUGFyYW1zLml0ZW1JbmRleCxcclxuICAgICAgICAgICAgICAgIGl0ZW1JZCA9IGl0ZW1QYXJhbXMuaXRlbUlkLFxyXG4gICAgICAgICAgICAgICAgaXRlbXMgPSBpdGVtUGFyYW1zLml0ZW1zIHx8IHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSArIHRoaXMubW9kaWZpZXIpLFxyXG4gICAgICAgICAgICAgICAgaXRlbXNMZW5ndGggPSBpdGVtcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICBpdGVtID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtUGFyYW1zLml0ZW0pIHJldHVybiBpdGVtUGFyYW1zLml0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA9PT0gdW5kZWZpbmVkICYmIGl0ZW1JbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4ID0gaXRlbXMuaW5kZXgoaXRlbXMuZmlsdGVyKCdbcGlwLWlkPScgKyBpdGVtSWQgKyAnXScpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA+PSAwICYmIGl0ZW1JbmRleCA8IGl0ZW1zTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtc1tpdGVtSW5kZXhdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcmFpc2VFdmVudCA9IGl0ZW1QYXJhbXMucmFpc2VFdmVudDtcclxuICAgICAgICAgICAgICAgIGl0ZW0gPSBpdGVtKCk7XHJcbiAgICAgICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmZpbmQodGhpcy5jbGFzc05hbWUpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCBtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICBpdGVtID0gPGFueT5hbmd1bGFyLmVsZW1lbnQoaXRlbSlcclxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NlbGVjdGVkIG1kLWZvY3VzZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vU2Nyb2xsKSB0aGlzLnNjcm9sbFRvSXRlbShpdGVtKTtcclxuICAgICAgICAgICAgICAgIGlmIChyYWlzZUV2ZW50KSB0aGlzLmRlZmluZVNlbGVjdGVkSW5kZXgoaXRlbXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBkZWZpbmVTZWxlY3RlZEluZGV4KGl0ZW1zKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9sZFNlbGVjdGVkSW5kZXggPSB0aGlzLnNlbGVjdGVkSW5kZXg7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgaXRlbXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJChpdGVtc1tpbmRleF0pLmhhc0NsYXNzKCdzZWxlY3RlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gaW5kZXg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBFeGVjdXRlIGNhbGxiYWNrIHRvIG5vdGlmeSBhYm91dCBpdGVtIHNlbGVjdFxyXG4gICAgICAgICAgICBpZiAob2xkU2VsZWN0ZWRJbmRleCAhPSB0aGlzLnNlbGVjdGVkSW5kZXggJiYgdGhpcy5zZWxlY3RlZEluZGV4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuJGFwcGx5KHVwZGF0ZUluZGV4KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRhcHBseShvblNlbGVjdCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZUluZGV4KCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW1zW3RoaXMuc2VsZWN0ZWRJbmRleF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBzZWxlY3RlZEl0ZW0uYXR0cigncGlwLWlkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5kZXhTZXR0ZXIpIHRoaXMuaW5kZXhTZXR0ZXIodGhpcy4kc2NvcGUsIHRoaXMuc2VsZWN0ZWRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZFNldHRlcikgdGhpcy5pZFNldHRlcih0aGlzLiRzY29wZSwgc2VsZWN0ZWRJZCk7XHJcbiAgICAgICAgICAgICAgICBvblNlbGVjdCgpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gb25TZWxlY3QoKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSBhbmd1bGFyLmVsZW1lbnQoaXRlbXNbdGhpcy5zZWxlY3RlZEluZGV4XSksXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJZCA9IHNlbGVjdGVkSXRlbS5hdHRyKCdwaXAtaWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jaGFuZ2VHZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZUdldHRlcih0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGhpcy4kZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IHNlbGVjdGVkSXRlbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZWN0ZWRJZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0luZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJbmRleDogb2xkU2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcml2YXRlIHNjcm9sbFRvSXRlbSgkaXRlbSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ub1Njcm9sbCB8fCAhJGl0ZW0ub2Zmc2V0KCkpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJUb3AgPSB0aGlzLiRlbGVtZW50Lm9mZnNldCgpLnRvcCxcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IHRoaXMuJGVsZW1lbnQuaGVpZ2h0KCksXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBjb250YWluZXJUb3AgKyBjb250YWluZXJIZWlnaHQsXHJcbiAgICAgICAgICAgICAgICBpdGVtVG9wID0gJGl0ZW0ub2Zmc2V0KCkudG9wLFxyXG4gICAgICAgICAgICAgICAgaXRlbUhlaWdodCA9ICRpdGVtLm91dGVySGVpZ2h0KHRydWUpLFxyXG4gICAgICAgICAgICAgICAgaXRlbUJvdHRvbSA9IGl0ZW1Ub3AgKyBpdGVtSGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsVG9wID0gdGhpcy4kZWxlbWVudC5zY3JvbGxUb3AoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaXNTY3JvbGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc1Njcm9sbGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoY29udGFpbmVyVG9wID4gaXRlbVRvcCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgaXRlbVRvcCAtIGNvbnRhaW5lclRvcCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyQm90dG9tIDwgaXRlbUJvdHRvbSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgaXRlbUJvdHRvbSAtIGNvbnRhaW5lckJvdHRvbSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcml2YXRlIGdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXZlbnRUYXJnZXQpIHtcclxuICAgICAgICAgICAgLy8gT24gc29tZSBvbGRlciBicm93c2VycyB0aGUgZXZlbnQgdGFyZ2V0IG1heSBiZSBhIHRleHQgbm9kZS5cclxuICAgICAgICAgICAgaWYgKGV2ZW50VGFyZ2V0Lm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50VGFyZ2V0LnBhcmVudE5vZGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBldmVudFRhcmdldDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcml2YXRlIHRvdWNoSGFzTW92ZWQoZXZlbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgdG91Y2ggPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXSxcclxuICAgICAgICAgICAgICAgIGJvdW5kYXJ5ID0gdGhpcy50b3VjaEJvdW5kYXJ5OyAvLyBUb3VjaG1vdmUgYm91bmRhcnksIGJleW9uZCB3aGljaCBhIGNsaWNrIHdpbGwgYmUgY2FuY2VsbGVkLlxyXG5cclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHRvdWNoLnBhZ2VYIC0gdGhpcy50b3VjaFN0YXJ0WCkgPiBib3VuZGFyeSB8fCBNYXRoLmFicyh0b3VjaC5wYWdlWSAtIHRoaXMudG91Y2hTdGFydFkpID4gYm91bmRhcnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkNsaWNrRXZlbnQoZXZlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgIGl0ZW06IGV2ZW50LmN1cnJlbnRUYXJnZXQsXHJcbiAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvblRvdWNoU3RhcnQoZXZlbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgZXYgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICBpZiAoZXZbJ3RhcmdldFRvdWNoZXMnXS5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCB0YXJnZXRFbGVtZW50ID0gdGhpcy5nZXRUYXJnZXRFbGVtZW50RnJvbUV2ZW50VGFyZ2V0KGV2LnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICB0b3VjaCA9IGV2Wyd0YXJnZXRUb3VjaGVzJ11bMF07XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2sgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2tTdGFydCA9IGV2LnRpbWVTdGFtcDtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRFbGVtZW50ID0gdGFyZ2V0RWxlbWVudDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudG91Y2hTdGFydFggPSB0b3VjaC5wYWdlWDtcclxuICAgICAgICAgICAgdGhpcy50b3VjaFN0YXJ0WSA9IHRvdWNoLnBhZ2VZO1xyXG5cclxuICAgICAgICAgICAgLyppZiAoKGV2LnRpbWVTdGFtcCAtIHRoaXMubGFzdENsaWNrVGltZSkgPCB0aGlzLnRhcGRlbGF5KSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgfSovXHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Ub3VjaE1vdmUoZXZlbnQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnRyYWNraW5nQ2xpY2spIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGV2ID0gZXZlbnQub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgLy8gSWYgdGhlIHRvdWNoIGhhcyBtb3ZlZCwgY2FuY2VsIHRoZSBjbGljayB0cmFja2luZ1xyXG4gICAgICAgICAgICBpZiAodGhpcy50YXJnZXRFbGVtZW50ICE9PSB0aGlzLmdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXYudGFyZ2V0KSB8fCB0aGlzLnRvdWNoSGFzTW92ZWQoZXYpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0RWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvblRvdWNoRW5kKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGxldCBmb3JFbGVtZW50LCBuZXdUcmFja2luZ0NsaWNrU3RhcnQsIHRhcmdldFRhZ05hbWUsIHNjcm9sbFBhcmVudCwgdG91Y2gsIG5ld3RhcmdldEVsZW1lbnQgPSB0aGlzLnRhcmdldEVsZW1lbnQ7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMudHJhY2tpbmdDbGljaykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgZXYgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICAvLyBQcmV2ZW50IHBoYW50b20gY2xpY2tzIG9uIGZhc3QgZG91YmxlLXRhcCBcclxuICAgICAgICAgICAgaWYgKChldi50aW1lU3RhbXAgLSB0aGlzLmxhc3RDbGlja1RpbWUpIDwgdGhpcy50YXBkZWxheSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxOZXh0Q2xpY2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICgoZXYudGltZVN0YW1wIC0gdGhpcy50cmFja2luZ0NsaWNrU3RhcnQpID4gdGhpcy50YXBUaW1lb3V0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gUmVzZXQgdG8gcHJldmVudCB3cm9uZyBjbGljayBjYW5jZWwgb24gaW5wdXQgXHJcbiAgICAgICAgICAgIHRoaXMuY2FuY2VsTmV4dENsaWNrID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxhc3RDbGlja1RpbWUgPSBldmVudC50aW1lU3RhbXA7XHJcblxyXG4gICAgICAgICAgICBuZXdUcmFja2luZ0NsaWNrU3RhcnQgPSB0aGlzLnRyYWNraW5nQ2xpY2tTdGFydDtcclxuICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tpbmdDbGlja1N0YXJ0ID0gMDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICBpdGVtOiBldmVudC5jdXJyZW50VGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgcmFpc2VFdmVudDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Ub3VjaENhbmNlbChldmVudCkge1xyXG4gICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25LZXlEb3duKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBrZXlDb2RlID0gZXZlbnQud2hpY2ggfHwgZXZlbnQua2V5Q29kZTtcclxuXHJcbiAgICAgICAgICAgIC8vIENoZWNrIGNvbnRyb2wga2V5Q29kZVxyXG4gICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkVOVEVSIHx8IGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5TUEFDRSkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmVudGVyU3BhY2VHZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVudGVyU3BhY2VHZXR0ZXIodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHRoaXMuJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogdGhpcy5zZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTogdGhpcy4kZWxlbWVudC5maW5kKCcuc2VsZWN0ZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgaWYgKGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5MRUZUX0FSUk9XIHx8IGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8IGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIEdldCBuZXh0IHNlbGVjdGFibGUgY29udHJvbCBpbmRleFxyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQodGhpcy5jbGFzc05hbWUgKyB0aGlzLm1vZGlmaWVyKSxcclxuICAgICAgICAgICAgICAgICAgICBpbmMgPSAoa2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8IGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSA/IDEgOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICBuZXdTZWxlY3RlZEluZGV4ID0gdGhpcy5zZWxlY3RlZEluZGV4ICsgaW5jO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFNldCBuZXh0IGNvbnRyb2wgYXMgc2VsZWN0ZWRcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4OiBuZXdTZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiBpdGVtcyxcclxuICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkZvY3VzSW4oZXZlbnQpIHtcclxuICAgICAgICAgICAgLy8gQ2hvb3NlIHNlbGVjdGVkIGVsZW1lbnRcclxuICAgICAgICAgICAgbGV0IGl0ZW1zLFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtID0gdGhpcy4kZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lICsgJy5zZWxlY3RlZCcpO1xyXG5cclxuICAgICAgICAgICAgc2VsZWN0ZWRJdGVtLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbm90IHNlbGVjdGVkIGVsZW1lbnRzIHRoZW4gcGljayB0aGUgZmlyc3Qgb25lXHJcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEl0ZW0ubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSB0aGlzLmluZGV4R2V0dGVyKHRoaXMuJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgIGl0ZW1zID0gdGhpcy4kZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lICsgdGhpcy5tb2RpZmllcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogdGhpcy5zZWxlY3RlZEluZGV4IHx8IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXM6IGl0ZW1zLFxyXG4gICAgICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRm9jdXNPdXQoZXZlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lICsgJy5tZC1mb2N1c2VkJyArIHRoaXMubW9kaWZpZXIpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IFNlbGVjdGVkID0gZnVuY3Rpb24gKFxyXG4gICAgICAgICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICAkbWRDb25zdGFudDogYW55LFxyXG4gICAgICAgICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2VcclxuICAgICk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAgICAgJGF0dHJzOiBTZWxlY3RlZEF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgU2VsZWN0ZWRMaW5rKCRwYXJzZSwgJG1kQ29uc3RhbnQsICR0aW1lb3V0LCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKFwicGlwU2VsZWN0ZWRcIiwgW10pXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwU2VsZWN0ZWQnLCBTZWxlY3RlZCk7XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XHJcbntcclxuICAgIGludGVyZmFjZSBVbnNhdmVkQ2hhbmdlc1Njb3BlIGV4dGVuZHMgbmcuSVNjb3BlIHtcclxuICAgICAgICB1bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZTogRnVuY3Rpb247XHJcbiAgICAgICAgdW5zYXZlZENoYW5nZXNNZXNzYWdlOiBzdHJpbmc7XHJcbiAgICAgICAgY2FuY2VsTGVhdmU6IEZ1bmN0aW9uO1xyXG4gICAgICAgIGFmdGVyTGVhdmU6IEZ1bmN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIFVuc2F2ZWRDaGFuZ2VzTGluayB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgICRzY29wZTogVW5zYXZlZENoYW5nZXNTY29wZSxcclxuICAgICAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgJHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUudW5zYXZlZENoYW5nZXNBdmFpbGFibGUoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdW5iaW5kRnVuYyA9ICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlKCkgJiYgISR3aW5kb3cuY29uZmlybSgkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbigkc2NvcGUuY2FuY2VsTGVhdmUpICYmICRzY29wZS5jYW5jZWxMZWF2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbigkc2NvcGUuYWZ0ZXJMZWF2ZSkgJiYgJHNjb3BlLmFmdGVyTGVhdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICR3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdW5iaW5kRnVuYygpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgVW5zYXZlZENoYW5nZXMgPSBmdW5jdGlvbiAoJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0FFJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlJyxcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzTWVzc2FnZTogJ0BwaXBVbnNhdmVkQ2hhbmdlc01lc3NhZ2UnLFxyXG4gICAgICAgICAgICAgICAgYWZ0ZXJMZWF2ZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0FmdGVyTGVhdmUnLFxyXG4gICAgICAgICAgICAgICAgY2FuY2VsTGVhdmU6ICcmcGlwVW5zYXZlZENoYW5nZXNDYW5jZWxMZWF2ZSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZTogVW5zYXZlZENoYW5nZXNTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgbmV3IFVuc2F2ZWRDaGFuZ2VzTGluaygkc2NvcGUsICR3aW5kb3cpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZShcInBpcFVuc2F2ZWRDaGFuZ2VzXCIsIFtdKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoXCJwaXBVbnNhdmVkQ2hhbmdlc1wiLCBVbnNhdmVkQ2hhbmdlcyk7XHJcbn0iXX0=