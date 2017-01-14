(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.pip || (g.pip = {})).behaviors = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
    'use strict';
    angular.module('pipBehaviors', [
        'pipFocused',
        'pipSelected',
        'pipInfiniteScroll',
        'pipUnsavedChanges',
        'pipDraggable'
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
            restrict: 'A',
            require: "?ngModel",
            link: function ($scope, $element, $attrs) {
                var controls, controlsLength, withHidden = $attrs.pipWithHidden, opacityDelta = 0.4, opacityLimit = 0.5, _color, focusedColor = $attrs.pipFocusedColor ? $attrs.pipFocusedColor : null, reInit = $attrs.pipFocusedRebind ? $attrs.pipFocusedRebind : null, focusedTabindex = $attrs.pipFocusedTabindex ? parseInt($attrs.pipFocusedTabindex) || 0 : 0, isOpacity = $attrs.pipFocusedOpacity ? toBoolean($attrs.pipFocusedOpacity) : false;
                $timeout(init);
                $element.on('keydown', keydownListener);
                if ($scope.ngModel) {
                    $scope.$watch($attrs.ngModel, function () {
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
(function () {
    'use strict';
    var thisModule = angular.module("pipSelected", []);
    thisModule.directive('pipSelected', ['$parse', '$mdConstant', '$timeout', function ($parse, $mdConstant, $timeout) {
        return {
            restrict: 'A',
            scope: false,
            link: function ($scope, $element, $attrs) {
                var indexGetter = $attrs.pipSelected ? $parse($attrs.pipSelected) : null, indexSetter = indexGetter ? indexGetter.assign : null, idGetter = $attrs.pipSelectedId ? $parse($attrs.pipSelectedId) : null, idSetter = idGetter ? idGetter.assign : null, changeGetter = $attrs.pipSelect ? $parse($attrs.pipSelect) : null, enterSpaceGetter = $attrs.pipEnterSpacePress ? $parse($attrs.pipEnterSpacePress) : null, noScroll = toBoolean($attrs.pipNoScroll), modifier = toBoolean($attrs.pipSkipHidden) ? ':visible' : '', className = toBoolean($attrs.pipTreeList) ? '.pip-selectable-tree' : '.pip-selectable', selectedIndex = indexGetter($scope), currentElementTabinex = $element.attr('tabindex'), pipSelectedWatch = $attrs.pipSelectedWatch, isScrolled = false;
                $element.attr('tabindex', currentElementTabinex || 0);
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
                $element.on('click touchstart', className, function (event) {
                    selectItem({ item: event.currentTarget, raiseEvent: true });
                });
                $element.on('keydown', function (e) {
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
                });
                $element.on('focusin', function (event) {
                    var items, selectedItem = $element.find(className + '.selected');
                    selectedItem.addClass('md-focused');
                    if (selectedItem.length === 0) {
                        selectedIndex = indexGetter($scope);
                        items = $element.find(className + modifier);
                        selectItem({ itemIndex: selectedIndex || 0, items: items, raiseEvent: true });
                    }
                });
                $element.on('focusout', function (event) {
                    $element.find(className + '.md-focused' + modifier).removeClass('md-focused');
                });
            }
        };
    }]);
})();
},{}],6:[function(require,module,exports){
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
},{}]},{},[1,2,3,4,5,6])(6)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmVoYXZpb3JzLnRzIiwic3JjL2RyYWdnYWJsZS9kcmFnZ2FibGUudHMiLCJzcmMvZm9jdXNlZC9mb2N1c2VkLnRzIiwic3JjL2luZmluaXRlX3Njcm9sbC9pbmZpbml0ZV9zY3JvbGwudHMiLCJzcmMvc2VsZWN0ZWQvc2VsZWN0ZWQudHMiLCJzcmMvdW5zYXZlZF9jaGFuZ2VzL3Vuc2F2ZWRfY2hhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ09BLENBQUM7SUFDRyxZQUFZLENBQUM7SUFFYixPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtRQUMzQixZQUFZO1FBQ1osYUFBYTtRQUNiLG1CQUFtQjtRQUNuQixtQkFBbUI7UUFDbkIsY0FBYztLQUNqQixDQUFDLENBQUM7QUFFUCxDQUFDLENBQUMsRUFBRSxDQUFDOztBQ2hCTCxDQUFDO0lBQ0csWUFBWSxDQUFDO0lBRWIsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFcEQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUU7UUFFL0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxLQUFLO1lBQzlCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsQ0FBQztZQUVELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMs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QUVILE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFO29CQUNuQixPQUFPLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztvQkFDOUIsVUFBVSxFQUFFLENBQUM7Z0JBQ2pCLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztTQUNKLENBQUM7SUFDTixDQUFDLENBQUMsQ0FBQztBQUVQLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwi77u/LyoqXHJcbiAqIEBmaWxlIFJlZ2lzdHJhdGlvbiBvZiBhbGwgV2ViVUkgbGlzdCBjb250cm9sc1xyXG4gKiBAY29weXJpZ2h0IERpZ2l0YWwgTGl2aW5nIFNvZnR3YXJlIENvcnAuIDIwMTQtMjAxNlxyXG4gKi9cclxuXHJcbi8qIGdsb2JhbCBhbmd1bGFyICovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCdwaXBCZWhhdmlvcnMnLCBbXHJcbiAgICAgICAgJ3BpcEZvY3VzZWQnLFxyXG4gICAgICAgICdwaXBTZWxlY3RlZCcsXHJcbiAgICAgICAgJ3BpcEluZmluaXRlU2Nyb2xsJyxcclxuICAgICAgICAncGlwVW5zYXZlZENoYW5nZXMnLFxyXG4gICAgICAgICdwaXBEcmFnZ2FibGUnXHJcbiAgICBdKTtcclxuICAgIFxyXG59KSgpOyIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIHRoaXNNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShcInBpcERyYWdnYWJsZVwiLCBbXSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5zZXJ2aWNlKCdwaXBEcmFnZ2FibGUnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XHJcbiAgICAgICAgc2NvcGUuaW5wdXRFdmVudCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoZXZlbnQudG91Y2hlcykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudC50b3VjaGVzWzBdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vQ2hlY2tpbmcgYm90aCBpcyBub3QgcmVkdW5kZW50LiBJZiBvbmx5IGNoZWNrIGlmIHRvdWNoZXMgaXNEZWZpbmVkLCBhbmd1bGFyanMgaXNEZWZuaWVkIHdpbGwgcmV0dXJuIGVycm9yIGFuZCBzdG9wIHRoZSByZW1haW5pbmcgc2NyaXB0eSBpZiBldmVudC5vcmlnaW5hbEV2ZW50IGlzIG5vdCBkZWZpbmVkLlxyXG4gICAgICAgICAgICBlbHNlIGlmIChhbmd1bGFyLmlzRGVmaW5lZChldmVudC5vcmlnaW5hbEV2ZW50KSAmJiBhbmd1bGFyLmlzRGVmaW5lZChldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBldmVudDtcclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBEcmFnJyxcclxuICAgICAgICBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHBhcnNlLCAkZG9jdW1lbnQsICR3aW5kb3csIHBpcERyYWdnYWJsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG5cclxuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGU6IGFueSwgZWxlbWVudCwgYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZhbHVlID0gYXR0cnMubmdEcmFnO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBMT05HX1BSRVNTID0gNTA7IC8vIDUwbXMgZm9yIGxvbmdwcmVzc1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvZmZzZXQsIF9jZW50ZXJBbmNob3IgPSBmYWxzZSwgX214LCBfbXksIF90eCwgX3R5LCBfbXJ4LCBfbXJ5O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfaGFzVG91Y2ggPSAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KSB8fCAoPGFueT53aW5kb3cpLkRvY3VtZW50VG91Y2g7IC8vICYmIGRvY3VtZW50IGluc3RhbmNlb2YgRG9jdW1lbnRUb3VjaDsgLy8gRG9jdW1lbnRUb3VjaCBpcyBub3QgZGVmaW5lZCFcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX3ByZXNzRXZlbnRzID0gJ3RvdWNoc3RhcnQgbW91c2Vkb3duJztcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX21vdmVFdmVudHMgPSAndG91Y2htb3ZlIG1vdXNlbW92ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9yZWxlYXNlRXZlbnRzID0gJ3RvdWNoZW5kIG1vdXNldXAnO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZHJhZ0hhbmRsZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdG8gaWRlbnRpZnkgdGhlIGVsZW1lbnQgaW4gb3JkZXIgdG8gcHJldmVudCBnZXR0aW5nIHN1cGVyZmxvdXMgZXZlbnRzIHdoZW4gYSBzaW5nbGUgZWxlbWVudCBoYXMgYm90aCBkcmFnIGFuZCBkcm9wIGRpcmVjdGl2ZXMgb24gaXQuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9teWlkID0gc2NvcGUuJGlkO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZGF0YSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZHJhZ09mZnNldCA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZHJhZ0VuYWJsZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9wcmVzc1RpbWVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9lbGVtZW50U3R5bGU6IGFueSA9IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3RhcnRDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RhcnQpIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N0b3BDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RvcCkgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3VjY2Vzc0NhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdWNjZXNzKSB8fCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhbGxvd1RyYW5zZm9ybSA9IGFuZ3VsYXIuaXNEZWZpbmVkKGF0dHJzLmFsbG93VHJhbnNmb3JtKSA/IHNjb3BlLiRldmFsKGF0dHJzLmFsbG93VHJhbnNmb3JtKSA6IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0RHJhZ0RhdGEgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNhbFNjcm9sbCA9IHRvQm9vbGVhbihhdHRycy5waXBWZXJ0aWNhbFNjcm9sbCkgfHwgdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXpvbnRhbFNjcm9sbCA9IHRvQm9vbGVhbihhdHRycy5waXBIb3Jpem9udGFsU2Nyb2xsKSB8fCB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmF0aW9uRGlzdGFuY2UgPSBwYXJzZUZsb2F0KGF0dHJzLnBpcEFjdGl2YXRpb25EaXN0YW5jZSkgfHwgNzUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbERpc3RhbmNlID0gcGFyc2VGbG9hdChhdHRycy5waXBTY3JvbGxEaXN0YW5jZSkgfHwgNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFBhcmVudCA9IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHdpbmRvdyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lckdldHRlciA9ICRwYXJzZShhdHRycy5waXBTY3JvbGxDb250YWluZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBkZXJlZ2lzdHJhdGlvbiBmdW5jdGlvbiBmb3IgbW91c2UgbW92ZSBldmVudHMgaW4gJHJvb3RTY29wZSB0cmlnZ2VyZWQgYnkganFMaXRlIHRyaWdnZXIgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSBhbmd1bGFyLm5vb3A7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cigncGlwLWRyYWdnYWJsZScsICdmYWxzZScpOyAvLyBwcmV2ZW50IG5hdGl2ZSBkcmFnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiBkcmFnIGhhbmRsZShzKSB3YXMgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHF1ZXJ5U2VsZWN0b3JBbGwgaXMgYXZhaWxhYmxlLCB3ZSB1c2UgdGhpcyBpbnN0ZWFkIG9mIGZpbmRcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgSlFMaXRlIGZpbmQgaXMgbGltaXRlZCB0byB0YWduYW1lc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZHJhZ0hhbmRsZXM6IGFueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRbMF0ucXVlcnlTZWxlY3RvckFsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0hhbmRsZXMgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yQWxsKCdbcGlwLWRyYWctaGFuZGxlXScpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdIYW5kbGVzID0gZWxlbWVudC5maW5kKCdbcGlwLWRyYWctaGFuZGxlXScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkcmFnSGFuZGxlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnSGFuZGxlID0gZHJhZ0hhbmRsZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY3JvbGwgY29udGFpbmVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxQYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChlbGVtZW50LnBhcmVudCgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhdHRycy5waXBTY3JvbGxDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChzY3JvbGxDb250YWluZXJHZXR0ZXIoc2NvcGUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b0Jvb2xlYW4odmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09ICcxJyB8fCB2YWx1ZSA9PSAndHJ1ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZW5hYmxlKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGxpc3RlbmVycy5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBvbkRlc3Ryb3kpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goYXR0cnMucGlwRHJhZywgb25FbmFibGVDaGFuZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goYXR0cnMucGlwQ2VudGVyQW5jaG9yLCBvbkNlbnRlckFuY2hvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdpcmUgdXAgdG91Y2ggZXZlbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfZHJhZ0hhbmRsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlKHMpIHNwZWNpZmllZCwgdXNlIHRob3NlIHRvIGluaXRpYXRlIGRyYWdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnSGFuZGxlLm9uKF9wcmVzc0V2ZW50cywgb25wcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBubyBoYW5kbGUocykgc3BlY2lmaWVkLCB1c2UgdGhlIGVsZW1lbnQgYXMgdGhlIGhhbmRsZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5vbihfcHJlc3NFdmVudHMsIG9ucHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2hhc1RvdWNoICYmIGVsZW1lbnRbMF0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSBcImltZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7IC8vIHByZXZlbnQgbmF0aXZlIGRyYWcgZm9yIGltYWdlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRGVzdHJveShlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRW5hYmxlQ2hhbmdlKG5ld1ZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnRW5hYmxlZCA9IChuZXdWYWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25DZW50ZXJBbmNob3IobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKG5ld1ZhbCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2VudGVyQW5jaG9yID0gKG5ld1ZhbCB8fCAndHJ1ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaXNDbGlja2FibGVFbGVtZW50KGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5pc0RlZmluZWQoYW5ndWxhci5lbGVtZW50KGV2dC50YXJnZXQpLmF0dHIoXCJwaXAtY2FuY2VsLWRyYWdcIikpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvKlxyXG4gICAgICAgICAgICAgICAgICAgICAqIFdoZW4gdGhlIGVsZW1lbnQgaXMgY2xpY2tlZCBzdGFydCB0aGUgZHJhZyBiZWhhdmlvdXJcclxuICAgICAgICAgICAgICAgICAgICAgKiBPbiB0b3VjaCBkZXZpY2VzIGFzIGEgc21hbGwgZGVsYXkgc28gYXMgbm90IHRvIHByZXZlbnQgbmF0aXZlIHdpbmRvdyBzY3JvbGxpbmdcclxuICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbnByZXNzKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClyZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDbGlja2FibGVFbGVtZW50KGV2dCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dC50eXBlID09IFwibW91c2Vkb3duXCIgJiYgZXZ0LmJ1dHRvbiAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEbyBub3Qgc3RhcnQgZHJhZ2dpbmcgb24gcmlnaHQtY2xpY2tcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZUVsZW1lbnRTdHlsZXMoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfaGFzVG91Y2gpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcHJlc3NUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25sb25ncHJlc3MoZXZ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIExPTkdfUFJFU1MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKF9tb3ZlRXZlbnRzLCBjYW5jZWxQcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX3JlbGVhc2VFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubG9uZ3ByZXNzKGV2dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBzYXZlRWxlbWVudFN0eWxlcygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS5sZWZ0ID0gZWxlbWVudC5jc3MoJ2NzcycpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lbGVtZW50U3R5bGUudG9wID0gZWxlbWVudC5jc3MoJ3RvcCcpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lbGVtZW50U3R5bGUucG9zaXRpb24gPSBlbGVtZW50LmNzcygncG9zaXRpb24nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS53aWR0aCA9IGVsZW1lbnQuY3NzKCd3aWR0aCcpOyAgICBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNhbmNlbFByZXNzKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3ByZXNzVGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub2ZmKF9tb3ZlRXZlbnRzLCBjYW5jZWxQcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vZmYoX3JlbGVhc2VFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ubG9uZ3ByZXNzKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFsbG93VHJhbnNmb3JtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdPZmZzZXQgPSBvZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdPZmZzZXQgPSB7bGVmdDogZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0LCB0b3A6IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8YW55PmVsZW1lbnQpLmNlbnRlclggPSBlbGVtZW50WzBdLm9mZnNldFdpZHRoIC8gMjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxhbnk+ZWxlbWVudCkuY2VudGVyWSA9IGVsZW1lbnRbMF0ub2Zmc2V0SGVpZ2h0IC8gMjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9teCA9IHBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9teSA9IHBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9tcnggPSBfbXggLSBvZmZzZXQubGVmdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX21yeSA9IF9teSAtIG9mZnNldC50b3A7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfY2VudGVyQW5jaG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHggPSBfbXggLSAoPGFueT5lbGVtZW50KS5jZW50ZXJYIC0gJHdpbmRvdy5wYWdlWE9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eSA9IF9teSAtICg8YW55PmVsZW1lbnQpLmNlbnRlclkgLSAkd2luZG93LnBhZ2VZT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R4ID0gX214IC0gX21yeCAtICR3aW5kb3cucGFnZVhPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHkgPSBfbXkgLSBfbXJ5IC0gJHdpbmRvdy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKF9tb3ZlRXZlbnRzLCBvbm1vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX3JlbGVhc2VFdmVudHMsIG9ucmVsZWFzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgZXZlbnQgaXMgdXNlZCB0byByZWNlaXZlIG1hbnVhbGx5IHRyaWdnZXJlZCBtb3VzZSBtb3ZlIGV2ZW50c1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBqcUxpdGUgdW5mb3J0dW5hdGVseSBvbmx5IHN1cHBvcnRzIHRyaWdnZXJIYW5kbGVyKC4uLilcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VlIGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS90cmlnZ2VySGFuZGxlci9cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJ2RyYWdnYWJsZTpfdHJpZ2dlckhhbmRsZXJNb3ZlJywgb25tb3ZlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJ2RyYWdnYWJsZTpfdHJpZ2dlckhhbmRsZXJNb3ZlJywgZnVuY3Rpb24gKGV2ZW50LCBvcmlnRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubW92ZShvcmlnRXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ubW92ZShldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJhZ0VuYWJsZWQpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZWxlbWVudC5oYXNDbGFzcygncGlwLWRyYWdnaW5nJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kYXRhID0gZ2V0RHJhZ0RhdGEoc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTpzdGFydCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBfbXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogX215LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR4OiBfdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHk6IF90eSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogX2RhdGFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkRyYWdTdGFydENhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnU3RhcnRDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBfZGF0YSwgJGV2ZW50OiBldnR9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX214ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX215ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChob3Jpem9udGFsU2Nyb2xsIHx8IHZlcnRpY2FsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnVG9TY3JvbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9jZW50ZXJBbmNob3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eCA9IF9teCAtICg8YW55PmVsZW1lbnQpLmNlbnRlclggLSBfZHJhZ09mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R5ID0gX215IC0gKDxhbnk+ZWxlbWVudCkuY2VudGVyWSAtIF9kcmFnT2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eCA9IF9teCAtIF9tcnggLSBfZHJhZ09mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R5ID0gX215IC0gX21yeSAtIF9kcmFnT2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZUVsZW1lbnQoX3R4LCBfdHkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdkcmFnZ2FibGU6bW92ZScsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IF9teCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IF9teSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR4OiBfdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eTogX3R5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGV2dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBfZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpZDogX215aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnT2Zmc2V0OiBfZHJhZ09mZnNldFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ucmVsZWFzZShldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJhZ0VuYWJsZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTplbmQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBfbXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBfbXksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eDogX3R4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHk6IF90eSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBldnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogX2RhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogb25EcmFnQ29tcGxldGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aWQ6IF9teWlkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnQoKS5maW5kKCcucGlwLWRyYWctZW50ZXInKS5yZW1vdmVDbGFzcygncGlwLWRyYWctZW50ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzZXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9mZihfbW92ZUV2ZW50cywgb25tb3ZlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9mZihfcmVsZWFzZUV2ZW50cywgb25yZWxlYXNlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkRyYWdTdG9wQ2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnU3RvcENhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IF9kYXRhLCAkZXZlbnQ6IGV2dH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnQ29tcGxldGUoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb25EcmFnU3VjY2Vzc0NhbGxiYWNrKXJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdWNjZXNzQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogX2RhdGEsICRldmVudDogZXZ0fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVzZXQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbGxvd1RyYW5zZm9ybSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHt0cmFuc2Zvcm06ICcnLCAnei1pbmRleCc6ICcnLCAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnJywgJy1tcy10cmFuc2Zvcm0nOiAnJ30pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHsncG9zaXRpb24nOiBfZWxlbWVudFN0eWxlLnBvc2l0aW9uLCB0b3A6IF9lbGVtZW50U3R5bGUudG9wLCBsZWZ0OiBfZWxlbWVudFN0eWxlLmxlZnQsICd6LWluZGV4JzogJycsIHdpZHRoOiBfZWxlbWVudFN0eWxlLndpZHRofSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG1vdmVFbGVtZW50KHgsIHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVXaWR0aCA9IGVsZW1lbnQuY3NzKCd3aWR0aCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWxsb3dUcmFuc2Zvcm0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06ICdtYXRyaXgzZCgxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAnICsgeCArICcsICcgKyB5ICsgJywgMCwgMSknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd6LWluZGV4JzogOTk5OTksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJy13ZWJraXQtdHJhbnNmb3JtJzogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJy1tcy10cmFuc2Zvcm0nOiAnbWF0cml4KDEsIDAsIDAsIDEsICcgKyB4ICsgJywgJyArIHkgKyAnKSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsZWZ0JzogeCArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RvcCc6IHkgKyAncHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdwb3NpdGlvbic6ICdmaXhlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiAxMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGVXaWR0aFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGRyYWdUb1Njcm9sbCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjcm9sbFggPSAwLCBzY3JvbGxZID0gMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0KCkgfHwge2xlZnQ6IDAsIHRvcDogMH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhvcml6b250YWxTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckxlZnQgPSBvZmZzZXQoc2Nyb2xsQ29udGFpbmVyKS5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcldpZHRoID0gc2Nyb2xsQ29udGFpbmVyLmlubmVyV2lkdGgoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJSaWdodCA9IGNvbnRhaW5lckxlZnQgKyBjb250YWluZXJXaWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKF9teCAtIGNvbnRhaW5lckxlZnQpIDwgYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWCA9IC1zY3JvbGxEaXN0YW5jZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKChjb250YWluZXJSaWdodCAtIF9teCkgPCBhY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxYID0gc2Nyb2xsRGlzdGFuY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ZXJ0aWNhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyVG9wID0gb2Zmc2V0KHNjcm9sbENvbnRhaW5lcikudG9wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IHNjcm9sbENvbnRhaW5lci5pbm5lckhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IGNvbnRhaW5lclRvcCArIGNvbnRhaW5lckhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKF9teSAtIGNvbnRhaW5lclRvcCkgPCBhY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxZID0gLXNjcm9sbERpc3RhbmNlICsgMzA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgoY29udGFpbmVyQm90dG9tIC0gX215KSA8IGFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFkgPSBzY3JvbGxEaXN0YW5jZSAtIDMwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxYICE9PSAwIHx8IHNjcm9sbFkgIT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbExlZnQgPSBzY3JvbGxDb250YWluZXIuc2Nyb2xsTGVmdCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbFRvcCA9IHNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIuc2Nyb2xsTGVmdChjb250YWluZXJTY3JvbGxMZWZ0ICsgc2Nyb2xsWCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIHNjcm9sbFkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBEcm9wJywgXHJcbiAgICAgICAgZnVuY3Rpb24gKCRwYXJzZSwgJHRpbWVvdXQsICR3aW5kb3csICRkb2N1bWVudCwgcGlwRHJhZ2dhYmxlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlOiBhbnksIGVsZW1lbnQsIGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLnZhbHVlID0gYXR0cnMucGlwRHJvcDtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmlzVG91Y2hpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgX2xhc3REcm9wVG91Y2ggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdmFyIF9teWlkID0gc2NvcGUuJGlkO1xyXG4gICAgICAgICAgICAgICAgdmFyIF9kcm9wRW5hYmxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBvbkRyb3BDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcm9wU3VjY2Vzcyk7Ly8gfHwgZnVuY3Rpb24oKXt9O1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N0YXJ0Q2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N0YXJ0KTtcclxuICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdG9wQ2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N0b3ApO1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJhZ01vdmVDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnTW92ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZW5hYmxlKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5waXBEcm9wLCBvbkVuYWJsZUNoYW5nZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIG9uRGVzdHJveSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6c3RhcnQnLCBvbkRyYWdTdGFydCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6bW92ZScsIG9uRHJhZ01vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRvbignZHJhZ2dhYmxlOmVuZCcsIG9uRHJhZ0VuZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EZXN0cm95KGVuYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyhmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICBfZHJvcEVuYWJsZWQgPSBuZXdWYWw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnU3RhcnQoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcm9wRW5hYmxlZClyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLnBpcERyYWdTdGFydCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdGFydENhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IG9iai5kYXRhLCAkZXZlbnQ6IG9ian0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnTW92ZShldnQsIG9iaikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX2Ryb3BFbmFibGVkKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBpc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMucGlwRHJhZ01vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnTW92ZUNhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IG9iai5kYXRhLCAkZXZlbnQ6IG9ian0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnRW5kKGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZG9uJ3QgbGlzdGVuIHRvIGRyb3AgZXZlbnRzIGlmIHRoaXMgaXMgdGhlIGVsZW1lbnQgYmVpbmcgZHJhZ2dlZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgdXBkYXRlIHRoZSBzdHlsZXMgYW5kIHJldHVyblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX2Ryb3BFbmFibGVkIHx8IF9teWlkID09PSBvYmoudWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZURyYWdTdHlsZXMoZmFsc2UsIG9iai5lbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVG91Y2hpbmcob2JqLngsIG9iai55LCBvYmouZWxlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FsbCB0aGUgcGlwRHJhZ2dhYmxlIHBpcERyYWdTdWNjZXNzIGVsZW1lbnQgY2FsbGJhY2tcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai5jYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqLmNhbGxiYWNrKG9iaik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5waXBEcm9wU3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJvcENhbGxiYWNrKHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRkYXRhOiBvYmouZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBvYmosXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0YXJnZXQ6IHNjb3BlLiRldmFsKHNjb3BlLnZhbHVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5waXBEcmFnU3RvcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdG9wQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogb2JqLmRhdGEsICRldmVudDogb2JqfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlRHJhZ1N0eWxlcyhmYWxzZSwgb2JqLmVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGlzVG91Y2hpbmcobW91c2VYLCBtb3VzZVksIGRyYWdFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRvdWNoaW5nID0gaGl0VGVzdChtb3VzZVgsIG1vdXNlWSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaXNUb3VjaGluZyA9IHRvdWNoaW5nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0b3VjaGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbGFzdERyb3BUb3VjaCA9IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZURyYWdTdHlsZXModG91Y2hpbmcsIGRyYWdFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG91Y2hpbmc7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlRHJhZ1N0eWxlcyh0b3VjaGluZywgZHJhZ0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodG91Y2hpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWctZW50ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0VsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1kcmFnLW92ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF9sYXN0RHJvcFRvdWNoID09IGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2xhc3REcm9wVG91Y2ggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnRWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaGl0VGVzdCh4LCB5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJvdW5kcyA9IGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgeCAtPSAkZG9jdW1lbnRbMF0uYm9keS5zY3JvbGxMZWZ0ICsgJGRvY3VtZW50WzBdLmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgIHkgLT0gJGRvY3VtZW50WzBdLmJvZHkuc2Nyb2xsVG9wICsgJGRvY3VtZW50WzBdLmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHggPj0gYm91bmRzLmxlZnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgeCA8PSBib3VuZHMucmlnaHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgeSA8PSBib3VuZHMuYm90dG9tXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIHkgPj0gYm91bmRzLnRvcDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICAvL3RoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBEcmFnQ2xvbmUnLCBmdW5jdGlvbiAoJHBhcnNlLCAkdGltZW91dCwgcGlwRHJhZ2dhYmxlKSB7XHJcbiAgICAvLyAgICByZXR1cm4ge1xyXG4gICAgLy8gICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAvLyAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgLy8gICAgICAgICAgICB2YXIgaW1nLCBfYWxsb3dDbG9uZSA9IHRydWU7XHJcbiAgICAvLyAgICAgICAgICAgIHZhciBfZHJhZ09mZnNldCA9IG51bGw7XHJcbiAgICAvLyAgICAgICAgICAgIHNjb3BlLmNsb25lZERhdGEgPSB7fTtcclxuICAgIC8vICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG4gICAgLy8gICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaW1nID0gZWxlbWVudC5maW5kKCdpbWcnKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cigncGlwLWRyYWdnYWJsZScsICdmYWxzZScpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaW1nLmF0dHIoJ2RyYWdnYWJsZScsICdmYWxzZScpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgcmVzZXQoKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuICAgIC8vICAgICAgICAgICAgfVxyXG4vL1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgICAgICBpZiAoIWVuYWJsZSlyZXR1cm47XHJcbiAgICAvLyAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG4gICAgLy8gICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6c3RhcnQnLCBvbkRyYWdTdGFydCk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTptb3ZlJywgb25EcmFnTW92ZSk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTplbmQnLCBvbkRyYWdFbmQpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgcHJldmVudENvbnRleHRNZW51KCk7XHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIHByZXZlbnRDb250ZXh0TWVudSgpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIC8vICBlbGVtZW50Lm9mZignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGltZy5vZmYoJ21vdXNlZG93biB0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIGFic29yYkV2ZW50Xyk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAvLyAgZWxlbWVudC5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGltZy5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgIC8vICAgICAgICAgICAgfVxyXG5cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnU3RhcnQoZXZ0LCBvYmosIGVsbSkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgX2FsbG93Q2xvbmUgPSB0cnVlO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKG9iai5kYXRhLmFsbG93Q2xvbmUpKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgX2FsbG93Q2xvbmUgPSBvYmouZGF0YS5hbGxvd0Nsb25lO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgfVxyXG4gICAgLy8gICAgICAgICAgICAgICAgaWYgKF9hbGxvd0Nsb25lKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuY2xvbmVkRGF0YSA9IG9iai5kYXRhO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKCd3aWR0aCcsIG9iai5lbGVtZW50WzBdLm9mZnNldFdpZHRoKTtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNzcygnaGVpZ2h0Jywgb2JqLmVsZW1lbnRbMF0ub2Zmc2V0SGVpZ2h0KTtcclxuLy9cclxuICAgIC8vICAgICAgICAgICAgICAgICAgICBtb3ZlRWxlbWVudChvYmoudHgsIG9iai50eSk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICB9XHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIG9uRHJhZ01vdmUoZXZ0LCBvYmopIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIGlmIChfYWxsb3dDbG9uZSkge1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIF90eCA9IG9iai50eCArIG9iai5kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgX3R5ID0gb2JqLnR5ICsgb2JqLmRyYWdPZmZzZXQudG9wO1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIG1vdmVFbGVtZW50KF90eCwgX3R5KTtcclxuICAgIC8vICAgICAgICAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgICAgfVxyXG5cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnRW5kKGV2dCwgb2JqKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAvL21vdmVFbGVtZW50KG9iai50eCxvYmoudHkpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaWYgKF9hbGxvd0Nsb25lKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgcmVzZXQoKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgICAgfVxyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiByZXNldCgpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHtsZWZ0OiAwLCB0b3A6IDAsIHBvc2l0aW9uOiAnZml4ZWQnLCAnei1pbmRleCc6IC0xLCB2aXNpYmlsaXR5OiAnaGlkZGVuJ30pO1xyXG4gICAgLy8gICAgICAgICAgICB9XHJcblxyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiBtb3ZlRWxlbWVudCh4LCB5KSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBlbGVtZW50LmNzcyh7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiAnbWF0cml4M2QoMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgJyArIHggKyAnLCAnICsgeSArICcsIDAsIDEpJyxcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6IDk5OTk5LFxyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICd2aXNpYmlsaXR5JzogJ3Zpc2libGUnLFxyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICctd2Via2l0LXRyYW5zZm9ybSc6ICdtYXRyaXgzZCgxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAnICsgeCArICcsICcgKyB5ICsgJywgMCwgMSknLFxyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICctbXMtdHJhbnNmb3JtJzogJ21hdHJpeCgxLCAwLCAwLCAxLCAnICsgeCArICcsICcgKyB5ICsgJyknXHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgLy8sbWFyZ2luOiAnMCcgIGRvbid0IG1vbmtleSB3aXRoIHRoZSBtYXJnaW4sXHJcbiAgICAvLyAgICAgICAgICAgICAgICB9KTtcclxuICAgIC8vICAgICAgICAgICAgfVxyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiBhYnNvcmJFdmVudF8oZXZlbnQpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIHZhciBlID0gZXZlbnQ7Ly8ub3JpZ2luYWxFdmVudDtcclxuICAgIC8vICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQgJiYgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24gJiYgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcclxuICAgIC8vICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIC8vICAgICAgICAgICAgfVxyXG4vL1xyXG4gICAgLy8gICAgICAgIH1cclxuICAgIC8vICAgIH07XHJcbiAgICAvL30pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBQcmV2ZW50RHJhZycsIGZ1bmN0aW9uICgkcGFyc2UsICR0aW1lb3V0KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlOiBhbnksIGVsZW1lbnQsIGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBhYnNvcmJFdmVudF8oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCAmJiBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24gJiYgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwQ2FuY2VsRHJhZycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmZpbmQoJyonKS5hdHRyKCdwaXAtY2FuY2VsLWRyYWcnLCAncGlwLWNhbmNlbC1kcmFnJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcbn0pKCk7XHJcblxyXG4iLCIvKipcclxuICogQGZpbGUgS2V5Ym9hcmQgbmF2aWdhdGlvbiBvdmVyIGZldyBmb2N1c2FibGUgY29udHJvbHNcclxuICogQGNvcHlyaWdodCBEaWdpdGFsIExpdmluZyBTb2Z0d2FyZSBDb3JwLiAyMDE0LTIwMTZcclxuICovXHJcblxyXG4vKiBnbG9iYWwgYW5ndWxhciAqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwRm9jdXNlZFwiLCBbXSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcEZvY3VzZWQnLCBmdW5jdGlvbiAoJHRpbWVvdXQsICRtZENvbnN0YW50LCAkd2luZG93KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgcmVxdWlyZTogXCI/bmdNb2RlbFwiLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlOiBhbnksICRlbGVtZW50LCAkYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNvbnRyb2xzLCBjb250cm9sc0xlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICB3aXRoSGlkZGVuID0gJGF0dHJzLnBpcFdpdGhIaWRkZW4sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BhY2l0eURlbHRhID0gMC40LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wYWNpdHlMaW1pdCA9IDAuNSxcclxuICAgICAgICAgICAgICAgICAgICBfY29sb3IsXHJcbiAgICAgICAgICAgICAgICAgICAgZm9jdXNlZENvbG9yID0gJGF0dHJzLnBpcEZvY3VzZWRDb2xvciA/ICRhdHRycy5waXBGb2N1c2VkQ29sb3IgOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlSW5pdCA9ICRhdHRycy5waXBGb2N1c2VkUmViaW5kID8gJGF0dHJzLnBpcEZvY3VzZWRSZWJpbmQgOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvY3VzZWRUYWJpbmRleCA9ICRhdHRycy5waXBGb2N1c2VkVGFiaW5kZXggPyBwYXJzZUludCgkYXR0cnMucGlwRm9jdXNlZFRhYmluZGV4KSB8fCAwIDogMCxcclxuICAgICAgICAgICAgICAgICAgICBpc09wYWNpdHkgPSAkYXR0cnMucGlwRm9jdXNlZE9wYWNpdHkgPyB0b0Jvb2xlYW4oJGF0dHJzLnBpcEZvY3VzZWRPcGFjaXR5KSA6IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICR0aW1lb3V0KGluaXQpO1xyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2tleWRvd24nLCBrZXlkb3duTGlzdGVuZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUubmdNb2RlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJGF0dHJzLm5nTW9kZWwsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoaW5pdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQ29udmVydHMgdmFsdWUgaW50byBib29sZWFuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b0Jvb2xlYW4odmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPT0gJzEnIHx8IHZhbHVlID09ICd0cnVlJztcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gcmdiYShjb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmb2N1c2VkQ29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvY3VzZWRDb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhcnIgPSBjb2xvci5zcGxpdChcIihcIilbMV0uc3BsaXQoXCIpXCIpWzBdLnNwbGl0KFwiLFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhcnIgfHwgYXJyLmxlbmd0aCA8IDMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgcmVkLCBibHVlLCBncmVlbiwgb3BhY2l0eTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgb3BhY2l0eSA9IGFyci5sZW5ndGggPT0gMyA/IDEgOiBwYXJzZUZsb2F0KGFyclszXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVkID0gYXJyWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIGJsdWUgPSBhcnJbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JlZW4gPSBhcnJbMl07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcGFjaXR5IDwgb3BhY2l0eUxpbWl0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHkgKz0gb3BhY2l0eURlbHRhO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHkgLT0gb3BhY2l0eURlbHRhO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdyZ2JhKCcgKyByZWQgKyAnLCAnICsgYmx1ZSArICcsICcgKyBncmVlbiArICcsICcgKyBvcGFjaXR5ICsgJyknO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNldFRhYmluZGV4KGVsZW1lbnQsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGVja1RhYmluZGV4KGNvbnRyb2xzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gXy5maW5kSW5kZXgoY29udHJvbHMsIChjKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjWyd0YWJpbmRleCddID4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PSAtMSAmJiBjb250cm9scy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCBlbCA9IGNvbnRyb2xzWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUYWJpbmRleChhbmd1bGFyLmVsZW1lbnQoY29udHJvbHNbMF0pLCBmb2N1c2VkVGFiaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0KCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RvciA9IHdpdGhIaWRkZW4gPyAnLnBpcC1mb2N1c2FibGUnIDogJy5waXAtZm9jdXNhYmxlOnZpc2libGUnO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzID0gJGVsZW1lbnQuZmluZChzZWxlY3Rvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbHNMZW5ndGggPSBjb250cm9scy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tUYWJpbmRleChjb250cm9scyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIG5lZWRlZCBldmVudCBsaXN0ZW5lcnNcclxuICAgICAgICAgICAgICAgICAgICBjb250cm9scy5vbignZm9jdXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVJbml0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1mb2N1c2VkLWNvbnRhaW5lcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNPcGFjaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZWxsID0gYW5ndWxhci5lbGVtZW50KCQodGhpcylbMF0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jb2xvciA9ICQodGhpcykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIF9jb2xvciA9ICR3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSgkKHRoaXMpWzBdLCBudWxsKS5iYWNrZ3JvdW5kQ29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmNzcygnYmFja2dyb3VuZENvbG9yJywgcmdiYShfY29sb3IpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuYWRkQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuYWRkQ2xhc3MoJ21kLWZvY3VzZWQgbWQtZm9jdXNlZC1vcGFjaXR5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNldFRhYmluZGV4KGFuZ3VsYXIuZWxlbWVudCgkKHRoaXMpWzBdKSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSkub24oJ2ZvY3Vzb3V0JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISQodGhpcykuaGFzQ2xhc3MoJ21kLWZvY3VzZWQnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc09wYWNpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICQodGhpcykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCBfY29sb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmVDbGFzcygnbWQtZm9jdXNlZCBtZC1mb2N1c2VkLW9wYWNpdHknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBJIGdvIGZyb20gYmxvY2sgYWxsIGVsZW1lbnQgaGF2ZSB0YWJpbmRleCA9IC0xXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNldFRhYmluZGV4KGFuZ3VsYXIuZWxlbWVudCgkKHRoaXMpWzBdKSwgLTEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGtleWRvd25MaXN0ZW5lcihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleUNvZGUgPSBlLndoaWNoIHx8IGUua2V5Q29kZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBjb250cm9sIGtleUNvZGVcclxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5MRUZUX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuVVBfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1cpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jcmVtZW50ID0gKGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHwga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSA/IDEgOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vdmVUb0NvbnRyb2wgPSBjb250cm9scy5pbmRleChjb250cm9scy5maWx0ZXIoXCIubWQtZm9jdXNlZFwiKSkgKyBpbmNyZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1vdmUgZm9jdXMgdG8gbmV4dCBjb250cm9sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtb3ZlVG9Db250cm9sID49IDAgJiYgbW92ZVRvQ29udHJvbCA8IGNvbnRyb2xzTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sc1ttb3ZlVG9Db250cm9sXS5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxufSkoKTtcclxuXHJcbiIsIi8qKlxyXG4gKiBAZmlsZSBJbmZpbml0ZSBzY3JvbGxpbmcgYmVoYXZpb3JcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIE1vZGlmaWVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL3Nyb3plL25nSW5maW5pdGVTY3JvbGxcclxuICogQGNvcHlyaWdodCBEaWdpdGFsIExpdmluZyBTb2Z0d2FyZSBDb3JwLiAyMDE0LTIwMTZcclxuICovXHJcblxyXG4vKiBnbG9iYWwgYW5ndWxhciAqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwSW5maW5pdGVTY3JvbGxcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBJbmZpbml0ZVNjcm9sbCcsIFxyXG4gICAgICAgIGZ1bmN0aW9uKCRyb290U2NvcGUsICR3aW5kb3csICRpbnRlcnZhbCwgJHBhcnNlKSB7XHJcbiAgICAgICAgICAgIHZhciBUSFJPVFRMRV9NSUxMSVNFQ09ORFMgPSA1MDA7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgICAgICBwaXBJbmZpbml0ZVNjcm9sbDogJyYnLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbENvbnRhaW5lcjogJz0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbERpc3RhbmNlOiAnPScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwU2Nyb2xsRGlzYWJsZWQ6ICc9JyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbTogJz0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbExpc3RlbkZvckV2ZW50OiAnQCdcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGU6IGFueSwgJGVsZW1lbnQsICRhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja1doZW5FbmFibGVkID0gbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbW1lZGlhdGVDaGVjayA9IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbERpc3RhbmNlID0gbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRW5hYmxlZCA9IG51bGwsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lciA9IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZURvY3VtZW50Qm90dG9tID0gZmFsc2UsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3dFbGVtZW50ID0gYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhlaWdodChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50WzBdIHx8IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hTihlbGVtZW50Lm9mZnNldEhlaWdodCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvZmZzZXRUb3AoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0IHx8IGVsZW1lbnQuY3NzKCdub25lJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgKyBwYWdlWU9mZnNldChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBwYWdlWU9mZnNldChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50WzBdIHx8IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hTih3aW5kb3cucGFnZVlPZmZzZXQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkNvbnRhaW5lclNjcm9sbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20sIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyVG9wT2Zmc2V0LCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20sIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtYWluaW5nLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZFNjcm9sbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxDb250YWluZXIgPT09IHdpbmRvd0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IGhlaWdodChzY3JvbGxDb250YWluZXIpICsgcGFnZVlPZmZzZXQoc2Nyb2xsQ29udGFpbmVyWzBdLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gb2Zmc2V0VG9wKCRlbGVtZW50KSArIGhlaWdodCgkZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBoZWlnaHQoc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2Zmc2V0VG9wKHNjcm9sbENvbnRhaW5lcikgIT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCA9IG9mZnNldFRvcChzY3JvbGxDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSA9IG9mZnNldFRvcCgkZWxlbWVudCkgLSBjb250YWluZXJUb3BPZmZzZXQgKyBoZWlnaHQoJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodXNlRG9jdW1lbnRCb3R0b20pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSBoZWlnaHQoKCRlbGVtZW50WzBdLm93bmVyRG9jdW1lbnQgfHwgKDxhbnk+JGVsZW1lbnRbMF0pLmRvY3VtZW50KS5kb2N1bWVudEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1haW5pbmcgPSBlbGVtZW50Qm90dG9tIC0gY29udGFpbmVyQm90dG9tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRTY3JvbGwgPSByZW1haW5pbmcgPD0gaGVpZ2h0KHNjcm9sbENvbnRhaW5lcikgKiBzY3JvbGxEaXN0YW5jZSArIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2hvdWxkU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1doZW5FbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxFbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS4kJHBoYXNlIHx8ICRyb290U2NvcGUuJCRwaGFzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnBpcEluZmluaXRlU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS4kYXBwbHkoJHNjb3BlLnBpcEluZmluaXRlU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hlY2tXaGVuRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFRIUk9UVExFX01JTExJU0VDT05EUyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ29udGFpbmVyU2Nyb2xsID0gXy50aHJvdHRsZShvbkNvbnRhaW5lclNjcm9sbCwgVEhST1RUTEVfTUlMTElTRUNPTkRTKTsgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyLnVuYmluZCgnc2Nyb2xsJywgb25Db250YWluZXJTY3JvbGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaGFuZGxlU2Nyb2xsRGlzdGFuY2Uodikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2Nyb2xsRGlzdGFuY2UgPSBwYXJzZUZsb2F0KHYpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBTY3JvbGxEaXN0YW5jZScsIGhhbmRsZVNjcm9sbERpc3RhbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY3JvbGxEaXN0YW5jZSgkc2NvcGUucGlwU2Nyb2xsRGlzdGFuY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbERpc2FibGVkKHYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRW5hYmxlZCA9ICF2O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsRW5hYmxlZCAmJiBjaGVja1doZW5FbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1doZW5FbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb25Db250YWluZXJTY3JvbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsRGlzYWJsZWQnLCBoYW5kbGVTY3JvbGxEaXNhYmxlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsRGlzYWJsZWQoJHNjb3BlLnBpcFNjcm9sbERpc2FibGVkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20odikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlRG9jdW1lbnRCb3R0b20gPSB2O1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20nLCBoYW5kbGVTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20oJHNjb3BlLnBpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hhbmdlQ29udGFpbmVyKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsQ29udGFpbmVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci51bmJpbmQoJ3Njcm9sbCcsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gbmV3Q29udGFpbmVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzY3JvbGxDb250YWluZXIuYmluZCgnc2Nyb2xsJywgb25Db250YWluZXJTY3JvbGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ29udGFpbmVyKHdpbmRvd0VsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbigkc2NvcGUucGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbENvbnRhaW5lcihuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChuZXdDb250YWluZXIgPT0gbnVsbCkgfHwgbmV3Q29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld0NvbnRhaW5lci5hcHBlbmQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChuZXdDb250YWluZXJbbmV3Q29udGFpbmVyLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbmV3Q29udGFpbmVyID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29udGFpbmVyID0gJGVsZW1lbnQucGFyZW50cygpLmZpbmQobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPSBudWxsICYmICghQXJyYXkuaXNBcnJheShuZXdDb250YWluZXIpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoQXJyYXkuaXNBcnJheShuZXdDb250YWluZXIpICYmIG5ld0NvbnRhaW5lci5sZW5ndGggPiAwKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGFuZ2VDb250YWluZXIobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcGlwLXNjcm9sbC1jb250YWluZXIgYXR0cmlidXRlLlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsQ29udGFpbmVyJywgZnVuY3Rpb24gKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyICE9PSBzY3JvbGxDb250YWluZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY3JvbGxDb250YWluZXIobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY3JvbGxDb250YWluZXIoJHNjb3BlLnBpcFNjcm9sbENvbnRhaW5lciB8fCBbXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRhdHRycy5waXBTY3JvbGxQYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VDb250YWluZXIoYW5ndWxhci5lbGVtZW50KCRlbGVtZW50LnBhcmVudCgpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkYXR0cnMucGlwU2Nyb2xJbW1lZGlhdGVDaGVjayAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltbWVkaWF0ZUNoZWNrID0gJHNjb3BlLiRldmFsKCRhdHRycy5waXBTY3JvbEltbWVkaWF0ZUNoZWNrKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRpbnRlcnZhbCgoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbW1lZGlhdGVDaGVjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9uQ29udGFpbmVyU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KSwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICApO1xyXG5cclxufSkoKTtcclxuXHJcbiIsIi8qKlxyXG4gKiBAZmlsZSBLZXlib2FyZCBuYXZpZ2F0aW9uIHdpdGggc2Nyb2xsaW5nIG92ZXIgbm9uLWZvY3VzYWJsZSBjb250cm9sc1xyXG4gKiBAY29weXJpZ2h0IERpZ2l0YWwgTGl2aW5nIFNvZnR3YXJlIENvcnAuIDIwMTQtMjAxNlxyXG4gKi9cclxuXHJcbi8qIGdsb2JhbCBhbmd1bGFyICovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciB0aGlzTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoXCJwaXBTZWxlY3RlZFwiLCBbXSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcFNlbGVjdGVkJyxmdW5jdGlvbiAoJHBhcnNlLCAkbWRDb25zdGFudCwgJHRpbWVvdXQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGU6IGFueSwgJGVsZW1lbnQsICRhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICBpbmRleEdldHRlciA9ICRhdHRycy5waXBTZWxlY3RlZCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0ZWQpIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpbmRleFNldHRlciA9IGluZGV4R2V0dGVyID8gaW5kZXhHZXR0ZXIuYXNzaWduIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpZEdldHRlciA9ICRhdHRycy5waXBTZWxlY3RlZElkID8gJHBhcnNlKCRhdHRycy5waXBTZWxlY3RlZElkKSA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaWRTZXR0ZXIgPSBpZEdldHRlciA/IGlkR2V0dGVyLmFzc2lnbiA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0KSA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgZW50ZXJTcGFjZUdldHRlciA9ICRhdHRycy5waXBFbnRlclNwYWNlUHJlc3MgPyAkcGFyc2UoJGF0dHJzLnBpcEVudGVyU3BhY2VQcmVzcykgOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vU2Nyb2xsID0gdG9Cb29sZWFuKCRhdHRycy5waXBOb1Njcm9sbCksXHJcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZpZXIgPSB0b0Jvb2xlYW4oJGF0dHJzLnBpcFNraXBIaWRkZW4pID8gJzp2aXNpYmxlJyA6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZSA9IHRvQm9vbGVhbigkYXR0cnMucGlwVHJlZUxpc3QpID8gJy5waXAtc2VsZWN0YWJsZS10cmVlJyA6ICcucGlwLXNlbGVjdGFibGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleEdldHRlcigkc2NvcGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRFbGVtZW50VGFiaW5leCA9ICRlbGVtZW50LmF0dHIoJ3RhYmluZGV4JyksXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwU2VsZWN0ZWRXYXRjaCA9ICRhdHRycy5waXBTZWxlY3RlZFdhdGNoLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzU2Nyb2xsZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBTZXQgdGFiaW5kZXggaWYgaXQncyBub3Qgc2V0IHlldFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCBjdXJyZW50RWxlbWVudFRhYmluZXggfHwgMCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gV2F0Y2ggc2VsZWN0ZWQgaXRlbSBpbmRleFxyXG4gICAgICAgICAgICAgICAgaWYgKCF0b0Jvb2xlYW4oJGF0dHJzLnBpcFRyZWVMaXN0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goaW5kZXhHZXR0ZXIsIGZ1bmN0aW9uKG5ld1NlbGVjdGVkSW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbUluZGV4OiBuZXdTZWxlY3RlZEluZGV4fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goaWRHZXR0ZXIsIGZ1bmN0aW9uKG5ld1NlbGVjdGVkSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtpdGVtSWQ6IG5ld1NlbGVjdGVkSWQsIHJhaXNlRXZlbnQ6IHRydWV9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gV2F0Y2ggcmVzeW5jIHNlbGVjdGlvblxyXG4gICAgICAgICAgICAgICAgaWYgKHBpcFNlbGVjdGVkV2F0Y2gpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKHBpcFNlbGVjdGVkV2F0Y2gsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEZWxheSB1cGRhdGUgdG8gYWxsb3cgbmctcmVwZWF0IHRvIHVwZGF0ZSBET01cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleEdldHRlcigkc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbUluZGV4OiBzZWxlY3RlZEluZGV4fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gU2VsZWN0IGl0ZW0gZGVmaW5lZCBieSBpbmRleFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbUluZGV4OiBzZWxlY3RlZEluZGV4LCBpdGVtczogJGVsZW1lbnQuZmluZChjbGFzc05hbWUpfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQ29udmVydHMgdmFsdWUgaW50byBib29sZWFuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b0Jvb2xlYW4odmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPT0gJzEnIHx8IHZhbHVlID09ICd0cnVlJztcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIEZ1bmN0aW9ucyBhbmQgbGlzdGVuZXJzXHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2VsZWN0SXRlbShpdGVtUGFyYW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzU2Nyb2xsZWQpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbUluZGV4ID0gaXRlbVBhcmFtcy5pdGVtSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JZCA9IGl0ZW1QYXJhbXMuaXRlbUlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcyA9IGl0ZW1QYXJhbXMuaXRlbXMgfHwgJGVsZW1lbnQuZmluZChjbGFzc05hbWUgKyBtb2RpZmllciksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zTGVuZ3RoID0gaXRlbXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtUGFyYW1zLml0ZW0pIHJldHVybiBpdGVtUGFyYW1zLml0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUluZGV4ID09PSB1bmRlZmluZWQgJiYgaXRlbUluZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleCA9IGl0ZW1zLmluZGV4KGl0ZW1zLmZpbHRlcignW3BpcC1pZD0nICsgaXRlbUlkICsgJ10nKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUluZGV4ID49IDAgJiYgaXRlbUluZGV4IDwgaXRlbXNMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXNbaXRlbUluZGV4XVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50ID0gaXRlbVBhcmFtcy5yYWlzZUV2ZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSkucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkIG1kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IGFuZ3VsYXIuZWxlbWVudChpdGVtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzZWxlY3RlZCBtZC1mb2N1c2VkJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5mb2N1cygpOyAvLyB0b2RvINGB0LTQstC40LPQsNC10YIg0YHQv9C40YHQvtC6INGC0YPRgiwg0L3QsCDQv9C10YDQstC+0Lwg0L/RgNC+0YXQvtC00LVcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFub1Njcm9sbCkgc2Nyb2xsVG9JdGVtKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmFpc2VFdmVudCkgZGVmaW5lU2VsZWN0ZWRJbmRleChpdGVtcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBkZWZpbmVTZWxlY3RlZEluZGV4KGl0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZFNlbGVjdGVkSW5kZXggPSBzZWxlY3RlZEluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgaXRlbXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkKGl0ZW1zW2luZGV4XSkuaGFzQ2xhc3MoJ3NlbGVjdGVkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhlY3V0ZSBjYWxsYmFjayB0byBub3RpZnkgYWJvdXQgaXRlbSBzZWxlY3RcclxuICAgICAgICAgICAgICAgICAgICBpZiAob2xkU2VsZWN0ZWRJbmRleCAhPSBzZWxlY3RlZEluZGV4ICYmIHNlbGVjdGVkSW5kZXggIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkodXBkYXRlSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkob25TZWxlY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlSW5kZXgoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZEl0ZW0gPSBhbmd1bGFyLmVsZW1lbnQoaXRlbXNbc2VsZWN0ZWRJbmRleF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJZCA9IHNlbGVjdGVkSXRlbS5hdHRyKCdwaXAtaWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleFNldHRlcikgaW5kZXhTZXR0ZXIoJHNjb3BlLCBzZWxlY3RlZEluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkU2V0dGVyKSBpZFNldHRlcigkc2NvcGUsIHNlbGVjdGVkSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvblNlbGVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uU2VsZWN0KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW1zW3NlbGVjdGVkSW5kZXhdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBzZWxlY3RlZEl0ZW0uYXR0cigncGlwLWlkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhbmdlR2V0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VHZXR0ZXIoJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IHNlbGVjdGVkSXRlbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6IHNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBzZWxlY3RlZElkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJbmRleDogc2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkSW5kZXg6IG9sZFNlbGVjdGVkSW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9JdGVtKCRpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vU2Nyb2xsKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3AgPSAkZWxlbWVudC5vZmZzZXQoKS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9ICRlbGVtZW50LmhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBjb250YWluZXJUb3AgKyBjb250YWluZXJIZWlnaHQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1Ub3AgPSAkaXRlbS5vZmZzZXQoKS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1IZWlnaHQgPSAkaXRlbS5vdXRlckhlaWdodCh0cnVlKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUJvdHRvbSA9IGl0ZW1Ub3AgKyBpdGVtSGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJTY3JvbGxUb3AgPSAkZWxlbWVudC5zY3JvbGxUb3AoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzU2Nyb2xsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzU2Nyb2xsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRhaW5lclRvcCA+IGl0ZW1Ub3ApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIGl0ZW1Ub3AgLSBjb250YWluZXJUb3ApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChjb250YWluZXJCb3R0b20gPCBpdGVtQm90dG9tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LnNjcm9sbFRvcChjb250YWluZXJTY3JvbGxUb3AgKyBpdGVtQm90dG9tIC0gY29udGFpbmVyQm90dG9tKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5vbignY2xpY2sgdG91Y2hzdGFydCcsIGNsYXNzTmFtZSwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbTogZXZlbnQuY3VycmVudFRhcmdldCwgcmFpc2VFdmVudDogdHJ1ZX0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlDb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGNvbnRyb2wga2V5Q29kZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkVOVEVSIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuU1BBQ0UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudGVyU3BhY2VHZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGVyU3BhY2VHZXR0ZXIoJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiBzZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtOiAkZWxlbWVudC5maW5kKCcuc2VsZWN0ZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkxFRlRfQVJST1cgfHwga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IG5leHQgc2VsZWN0YWJsZSBjb250cm9sIGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpdGVtcyA9ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lICsgbW9kaWZpZXIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jID0gKGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHwga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSA/IDEgOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGVkSW5kZXggPSBzZWxlY3RlZEluZGV4ICsgaW5jO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG5leHQgY29udHJvbCBhcyBzZWxlY3RlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtpdGVtSW5kZXg6IG5ld1NlbGVjdGVkSW5kZXgsIGl0ZW1zOiBpdGVtcywgcmFpc2VFdmVudDogdHJ1ZX0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c2luJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hvb3NlIHNlbGVjdGVkIGVsZW1lbnRcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbSA9ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lICsgJy5zZWxlY3RlZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0uYWRkQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vdCBzZWxlY3RlZCBlbGVtZW50cyB0aGVuIHBpY2sgdGhlIGZpcnN0IG9uZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZEl0ZW0ubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleEdldHRlcigkc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcyA9ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lICsgbW9kaWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtpdGVtSW5kZXg6IHNlbGVjdGVkSW5kZXggfHwgMCwgaXRlbXM6IGl0ZW1zLCByYWlzZUV2ZW50OiB0cnVlfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2ZvY3Vzb3V0JywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuZmluZChjbGFzc05hbWUgKyAnLm1kLWZvY3VzZWQnICsgbW9kaWZpZXIpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbn0pKCk7XHJcblxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XHJcblxyXG4oZnVuY3Rpb24oKXtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwVW5zYXZlZENoYW5nZXNcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKFwicGlwVW5zYXZlZENoYW5nZXNcIiwgZnVuY3Rpb24gKCR3aW5kb3csICRyb290U2NvcGUpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0FFJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlJyxcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzTWVzc2FnZTogJ0BwaXBVbnNhdmVkQ2hhbmdlc01lc3NhZ2UnLFxyXG4gICAgICAgICAgICAgICAgYWZ0ZXJMZWF2ZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0FmdGVyTGVhdmUnLFxyXG4gICAgICAgICAgICAgICAgY2FuY2VsTGVhdmU6ICcmcGlwVW5zYXZlZENoYW5nZXNDYW5jZWxMZWF2ZSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlOiBhbnkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9uYmVmb3JldW5sb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS51bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJHJvdXRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS51bnNhdmVkQ2hhbmdlc01lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgdW5iaW5kRnVuYyA9ICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlKCkgJiYgISR3aW5kb3cuY29uZmlybSgkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRyb3V0aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oJHNjb3BlLmNhbmNlbExlYXZlKSAmJiAkc2NvcGUuY2FuY2VsTGVhdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oJHNjb3BlLmFmdGVyTGVhdmUpICYmICRzY29wZS5hZnRlckxlYXZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAkd2luZG93Lm9uYmVmb3JldW5sb2FkID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB1bmJpbmRGdW5jKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbn0pKCk7XHJcblxyXG4iXX0=