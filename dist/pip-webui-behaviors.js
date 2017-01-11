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
            require: "?ngModel",
            link: function ($scope, $element, $attrs) {
                var controls, controlsLength, withHidden = $attrs.pipWithHidden, opacityDelta = 0.4, opacityLimit = 0.5, _color, focusedColor = $attrs.pipFocusedColor ? $attrs.pipFocusedColor : null, isOpacity = $attrs.pipFocusedOpacity ? toBoolean($attrs.pipFocusedOpacity) : false;
                $timeout(init);
                $element.on('keydown', keydownListener);
                $scope.$watch($attrs.ngModel, function () {
                    $timeout(init);
                }, true);
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
                    element.attr('tabindex', '0');
                }
                function init() {
                    var selector = withHidden ? '.pip-focusable' : '.pip-focusable:visible';
                    controls = $element.find(selector);
                    controlsLength = controls.length;
                    controls.on('focus', function () {
                        if ($(this).hasClass('md-focused')) {
                            return;
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
                        setTabindex(angular.element($(this)[0]), '0');
                    }).on('focusout', function () {
                        $element.removeClass('pip-focused-container');
                        if (isOpacity) {
                            $(this).css('backgroundColor', "");
                            $(this).removeClass('md-focused md-focused-opacity');
                        }
                        else {
                            $(this).removeClass('md-focused');
                        }
                        setTabindex(angular.element($(this)[0]), '1');
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmVoYXZpb3JzLnRzIiwic3JjL2RyYWdnYWJsZS9kcmFnZ2FibGUudHMiLCJzcmMvZm9jdXNlZC9mb2N1c2VkLnRzIiwic3JjL2luZmluaXRlX3Njcm9sbC9pbmZpbml0ZV9zY3JvbGwudHMiLCJzcmMvc2VsZWN0ZWQvc2VsZWN0ZWQudHMiLCJzcmMvdW5zYXZlZF9jaGFuZ2VzL3Vuc2F2ZWRfY2hhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ09BLENBQUM7SUFDRyxZQUFZLENBQUM7SUFFYixPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtRQUMzQixZQUFZO1FBQ1osYUFBYTtRQUNiLG1CQUFtQjtRQUNuQixtQkFBbUI7UUFDbkIsY0FBYztLQUNqQixDQUFDLENBQUM7QUFFUCxDQUFDLENBQUMsRUFBRSxDQUFDOztBQ2hCTCxDQUFDO0lBQ0csWUFBWSxDQUFDO0lBRWIsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFcEQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUU7UUFFL0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxLQUFLO1lBQzlCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsQ0FBQztZQUVELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMs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Q3JGLFVBQVUsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO3dCQUMzQixDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQzFELEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDM0IsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDSixDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQzNELENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUU7b0JBQ25CLE9BQU8sQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO29CQUM5QixVQUFVLEVBQUUsQ0FBQztnQkFDakIsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1NBQ0osQ0FBQztJQUNOLENBQUMsQ0FBQyxDQUFDO0FBRVAsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCLvu78vKipcclxuICogQGZpbGUgUmVnaXN0cmF0aW9uIG9mIGFsbCBXZWJVSSBsaXN0IGNvbnRyb2xzXHJcbiAqIEBjb3B5cmlnaHQgRGlnaXRhbCBMaXZpbmcgU29mdHdhcmUgQ29ycC4gMjAxNC0yMDE2XHJcbiAqL1xyXG5cclxuLyogZ2xvYmFsIGFuZ3VsYXIgKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ3BpcEJlaGF2aW9ycycsIFtcclxuICAgICAgICAncGlwRm9jdXNlZCcsXHJcbiAgICAgICAgJ3BpcFNlbGVjdGVkJyxcclxuICAgICAgICAncGlwSW5maW5pdGVTY3JvbGwnLFxyXG4gICAgICAgICdwaXBVbnNhdmVkQ2hhbmdlcycsXHJcbiAgICAgICAgJ3BpcERyYWdnYWJsZSdcclxuICAgIF0pO1xyXG4gICAgXHJcbn0pKCk7IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwRHJhZ2dhYmxlXCIsIFtdKTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLnNlcnZpY2UoJ3BpcERyYWdnYWJsZScsIGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuICAgICAgICBzY29wZS5pbnB1dEV2ZW50ID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChldmVudC50b3VjaGVzKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy9DaGVja2luZyBib3RoIGlzIG5vdCByZWR1bmRlbnQuIElmIG9ubHkgY2hlY2sgaWYgdG91Y2hlcyBpc0RlZmluZWQsIGFuZ3VsYXJqcyBpc0RlZm5pZWQgd2lsbCByZXR1cm4gZXJyb3IgYW5kIHN0b3AgdGhlIHJlbWFpbmluZyBzY3JpcHR5IGlmIGV2ZW50Lm9yaWdpbmFsRXZlbnQgaXMgbm90IGRlZmluZWQuXHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50Lm9yaWdpbmFsRXZlbnQpICYmIGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGV2ZW50O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcERyYWcnLFxyXG4gICAgICAgIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcGFyc2UsICRkb2N1bWVudCwgJHdpbmRvdywgcGlwRHJhZ2dhYmxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZTogYW55LCBlbGVtZW50LCBhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudmFsdWUgPSBhdHRycy5uZ0RyYWc7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIExPTkdfUFJFU1MgPSA1MDsgLy8gNTBtcyBmb3IgbG9uZ3ByZXNzXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9mZnNldCwgX2NlbnRlckFuY2hvciA9IGZhbHNlLCBfbXgsIF9teSwgX3R4LCBfdHksIF9tcngsIF9tcnk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9oYXNUb3VjaCA9ICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpIHx8ICg8YW55PndpbmRvdykuRG9jdW1lbnRUb3VjaDsgLy8gJiYgZG9jdW1lbnQgaW5zdGFuY2VvZiBEb2N1bWVudFRvdWNoOyAvLyBEb2N1bWVudFRvdWNoIGlzIG5vdCBkZWZpbmVkIVxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfcHJlc3NFdmVudHMgPSAndG91Y2hzdGFydCBtb3VzZWRvd24nO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfbW92ZUV2ZW50cyA9ICd0b3VjaG1vdmUgbW91c2Vtb3ZlJztcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX3JlbGVhc2VFdmVudHMgPSAndG91Y2hlbmQgbW91c2V1cCc7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kcmFnSGFuZGxlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyB0byBpZGVudGlmeSB0aGUgZWxlbWVudCBpbiBvcmRlciB0byBwcmV2ZW50IGdldHRpbmcgc3VwZXJmbG91cyBldmVudHMgd2hlbiBhIHNpbmdsZSBlbGVtZW50IGhhcyBib3RoIGRyYWcgYW5kIGRyb3AgZGlyZWN0aXZlcyBvbiBpdC5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX215aWQgPSBzY29wZS4kaWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kYXRhID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kcmFnT2Zmc2V0ID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kcmFnRW5hYmxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX3ByZXNzVGltZXIgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX2VsZW1lbnRTdHlsZTogYW55ID0ge307XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdGFydENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdGFydCkgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3RvcENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdG9wKSB8fCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdWNjZXNzQ2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N1Y2Nlc3MpIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFsbG93VHJhbnNmb3JtID0gYW5ndWxhci5pc0RlZmluZWQoYXR0cnMuYWxsb3dUcmFuc2Zvcm0pID8gc2NvcGUuJGV2YWwoYXR0cnMuYWxsb3dUcmFuc2Zvcm0pIDogZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBnZXREcmFnRGF0YSA9ICRwYXJzZShhdHRycy5waXBEcmFnRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsU2Nyb2xsID0gdG9Cb29sZWFuKGF0dHJzLnBpcFZlcnRpY2FsU2Nyb2xsKSB8fCB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBob3Jpem9udGFsU2Nyb2xsID0gdG9Cb29sZWFuKGF0dHJzLnBpcEhvcml6b250YWxTY3JvbGwpIHx8IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRpb25EaXN0YW5jZSA9IHBhcnNlRmxvYXQoYXR0cnMucGlwQWN0aXZhdGlvbkRpc3RhbmNlKSB8fCA3NSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRGlzdGFuY2UgPSBwYXJzZUZsb2F0KGF0dHJzLnBpcFNjcm9sbERpc3RhbmNlKSB8fCA1MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsUGFyZW50ID0gZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQod2luZG93KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyR2V0dGVyID0gJHBhcnNlKGF0dHJzLnBpcFNjcm9sbENvbnRhaW5lcik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlcmVnaXN0cmF0aW9uIGZ1bmN0aW9uIGZvciBtb3VzZSBtb3ZlIGV2ZW50cyBpbiAkcm9vdFNjb3BlIHRyaWdnZXJlZCBieSBqcUxpdGUgdHJpZ2dlciBoYW5kbGVyXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lciA9IGFuZ3VsYXIubm9vcDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7IC8vIHByZXZlbnQgbmF0aXZlIGRyYWdcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgdG8gc2VlIGlmIGRyYWcgaGFuZGxlKHMpIHdhcyBzcGVjaWZpZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgcXVlcnlTZWxlY3RvckFsbCBpcyBhdmFpbGFibGUsIHdlIHVzZSB0aGlzIGluc3RlYWQgb2YgZmluZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhcyBKUUxpdGUgZmluZCBpcyBsaW1pdGVkIHRvIHRhZ25hbWVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkcmFnSGFuZGxlczogYW55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yQWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnSGFuZGxlcyA9IGFuZ3VsYXIuZWxlbWVudChlbGVtZW50WzBdLnF1ZXJ5U2VsZWN0b3JBbGwoJ1twaXAtZHJhZy1oYW5kbGVdJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0hhbmRsZXMgPSBlbGVtZW50LmZpbmQoJ1twaXAtZHJhZy1oYW5kbGVdJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRyYWdIYW5kbGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdIYW5kbGUgPSBkcmFnSGFuZGxlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVMaXN0ZW5lcnModHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHNjcm9sbCBjb250YWluZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbFBhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KGVsZW1lbnQucGFyZW50KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGF0dHJzLnBpcFNjcm9sbENvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHNjcm9sbENvbnRhaW5lckdldHRlcihzY29wZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHdpbmRvdyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvQm9vbGVhbih2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPT0gJzEnIHx8IHZhbHVlID09ICd0cnVlJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIG9uRGVzdHJveSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5waXBEcmFnLCBvbkVuYWJsZUNoYW5nZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5waXBDZW50ZXJBbmNob3IsIG9uQ2VudGVyQW5jaG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2lyZSB1cCB0b3VjaCBldmVudHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9kcmFnSGFuZGxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUocykgc3BlY2lmaWVkLCB1c2UgdGhvc2UgdG8gaW5pdGlhdGUgZHJhZ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdIYW5kbGUub24oX3ByZXNzRXZlbnRzLCBvbnByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIGhhbmRsZShzKSBzcGVjaWZpZWQsIHVzZSB0aGUgZWxlbWVudCBhcyB0aGUgaGFuZGxlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKF9wcmVzc0V2ZW50cywgb25wcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfaGFzVG91Y2ggJiYgZWxlbWVudFswXS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09IFwiaW1nXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTsgLy8gcHJldmVudCBuYXRpdmUgZHJhZyBmb3IgaW1hZ2VzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EZXN0cm95KGVuYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVMaXN0ZW5lcnMoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdFbmFibGVkID0gKG5ld1ZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkNlbnRlckFuY2hvcihuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQobmV3VmFsKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jZW50ZXJBbmNob3IgPSAobmV3VmFsIHx8ICd0cnVlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBpc0NsaWNrYWJsZUVsZW1lbnQoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmlzRGVmaW5lZChhbmd1bGFyLmVsZW1lbnQoZXZ0LnRhcmdldCkuYXR0cihcInBpcC1jYW5jZWwtZHJhZ1wiKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8qXHJcbiAgICAgICAgICAgICAgICAgICAgICogV2hlbiB0aGUgZWxlbWVudCBpcyBjbGlja2VkIHN0YXJ0IHRoZSBkcmFnIGJlaGF2aW91clxyXG4gICAgICAgICAgICAgICAgICAgICAqIE9uIHRvdWNoIGRldmljZXMgYXMgYSBzbWFsbCBkZWxheSBzbyBhcyBub3QgdG8gcHJldmVudCBuYXRpdmUgd2luZG93IHNjcm9sbGluZ1xyXG4gICAgICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ucHJlc3MoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2RyYWdFbmFibGVkKXJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NsaWNrYWJsZUVsZW1lbnQoZXZ0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZ0LnR5cGUgPT0gXCJtb3VzZWRvd25cIiAmJiBldnQuYnV0dG9uICE9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvIG5vdCBzdGFydCBkcmFnZ2luZyBvbiByaWdodC1jbGlja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlRWxlbWVudFN0eWxlcygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9oYXNUb3VjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9wcmVzc1RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmxvbmdwcmVzcyhldnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgTE9OR19QUkVTUyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX21vdmVFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vbihfcmVsZWFzZUV2ZW50cywgY2FuY2VsUHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25sb25ncHJlc3MoZXZ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNhdmVFbGVtZW50U3R5bGVzKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZWxlbWVudFN0eWxlLmxlZnQgPSBlbGVtZW50LmNzcygnY3NzJykgfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS50b3AgPSBlbGVtZW50LmNzcygndG9wJykgfHwgMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS5wb3NpdGlvbiA9IGVsZW1lbnQuY3NzKCdwb3NpdGlvbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZWxlbWVudFN0eWxlLndpZHRoID0gZWxlbWVudC5jc3MoJ3dpZHRoJyk7ICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY2FuY2VsUHJlc3MoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChfcHJlc3NUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vZmYoX21vdmVFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9mZihfcmVsZWFzZUV2ZW50cywgY2FuY2VsUHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25sb25ncHJlc3MoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2RyYWdFbmFibGVkKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWxsb3dUcmFuc2Zvcm0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZHJhZ09mZnNldCA9IG9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZHJhZ09mZnNldCA9IHtsZWZ0OiBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQsIHRvcDogZG9jdW1lbnQuYm9keS5zY3JvbGxUb3B9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxhbnk+ZWxlbWVudCkuY2VudGVyWCA9IGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGggLyAyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPGFueT5lbGVtZW50KS5jZW50ZXJZID0gZWxlbWVudFswXS5vZmZzZXRIZWlnaHQgLyAyO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX214ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX215ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX21yeCA9IF9teCAtIG9mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXJ5ID0gX215IC0gb2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9jZW50ZXJBbmNob3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eCA9IF9teCAtICg8YW55PmVsZW1lbnQpLmNlbnRlclggLSAkd2luZG93LnBhZ2VYT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R5ID0gX215IC0gKDxhbnk+ZWxlbWVudCkuY2VudGVyWSAtICR3aW5kb3cucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHggPSBfbXggLSBfbXJ4IC0gJHdpbmRvdy5wYWdlWE9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eSA9IF9teSAtIF9tcnkgLSAkd2luZG93LnBhZ2VZT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX21vdmVFdmVudHMsIG9ubW92ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vbihfcmVsZWFzZUV2ZW50cywgb25yZWxlYXNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBldmVudCBpcyB1c2VkIHRvIHJlY2VpdmUgbWFudWFsbHkgdHJpZ2dlcmVkIG1vdXNlIG1vdmUgZXZlbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGpxTGl0ZSB1bmZvcnR1bmF0ZWx5IG9ubHkgc3VwcG9ydHMgdHJpZ2dlckhhbmRsZXIoLi4uKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZWUgaHR0cDovL2FwaS5qcXVlcnkuY29tL3RyaWdnZXJIYW5kbGVyL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbignZHJhZ2dhYmxlOl90cmlnZ2VySGFuZGxlck1vdmUnLCBvbm1vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbignZHJhZ2dhYmxlOl90cmlnZ2VySGFuZGxlck1vdmUnLCBmdW5jdGlvbiAoZXZlbnQsIG9yaWdFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25tb3ZlKG9yaWdFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25tb3ZlKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbGVtZW50Lmhhc0NsYXNzKCdwaXAtZHJhZ2dpbmcnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RhdGEgPSBnZXREcmFnRGF0YShzY29wZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOnN0YXJ0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IF9teCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBfbXksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHg6IF90eCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eTogX3R5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBldnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBfZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9uRHJhZ1N0YXJ0Q2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdGFydENhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IF9kYXRhLCAkZXZlbnQ6IGV2dH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXggPSBwaXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VYO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXkgPSBwaXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VZO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhvcml6b250YWxTY3JvbGwgfHwgdmVydGljYWxTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdUb1Njcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2NlbnRlckFuY2hvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R4ID0gX214IC0gKDxhbnk+ZWxlbWVudCkuY2VudGVyWCAtIF9kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHkgPSBfbXkgLSAoPGFueT5lbGVtZW50KS5jZW50ZXJZIC0gX2RyYWdPZmZzZXQudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R4ID0gX214IC0gX21yeCAtIF9kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHkgPSBfbXkgLSBfbXJ5IC0gX2RyYWdPZmZzZXQudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3ZlRWxlbWVudChfdHgsIF90eSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTptb3ZlJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogX214LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogX215LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHg6IF90eCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5OiBfdHksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IF9kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdWlkOiBfbXlpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdPZmZzZXQ6IF9kcmFnT2Zmc2V0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25yZWxlYXNlKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOmVuZCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IF9teCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IF9teSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR4OiBfdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eTogX3R5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGV2dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBfZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBvbkRyYWdDb21wbGV0ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpZDogX215aWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnZ2luZycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnBhcmVudCgpLmZpbmQoJy5waXAtZHJhZy1lbnRlcicpLnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNldCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub2ZmKF9tb3ZlRXZlbnRzLCBvbm1vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub2ZmKF9yZWxlYXNlRXZlbnRzLCBvbnJlbGVhc2UpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9uRHJhZ1N0b3BDYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdG9wQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogX2RhdGEsICRldmVudDogZXZ0fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdDb21wbGV0ZShldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvbkRyYWdTdWNjZXNzQ2FsbGJhY2spcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N1Y2Nlc3NDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBfZGF0YSwgJGV2ZW50OiBldnR9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZXNldCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFsbG93VHJhbnNmb3JtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe3RyYW5zZm9ybTogJycsICd6LWluZGV4JzogJycsICctd2Via2l0LXRyYW5zZm9ybSc6ICcnLCAnLW1zLXRyYW5zZm9ybSc6ICcnfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moeydwb3NpdGlvbic6IF9lbGVtZW50U3R5bGUucG9zaXRpb24sIHRvcDogX2VsZW1lbnRTdHlsZS50b3AsIGxlZnQ6IF9lbGVtZW50U3R5bGUubGVmdCwgJ3otaW5kZXgnOiAnJywgd2lkdGg6IF9lbGVtZW50U3R5bGUud2lkdGh9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gbW92ZUVsZW1lbnQoeCwgeSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZVdpZHRoID0gZWxlbWVudC5jc3MoJ3dpZHRoJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbGxvd1RyYW5zZm9ybSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiA5OTk5OSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnbWF0cml4M2QoMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgJyArIHggKyAnLCAnICsgeSArICcsIDAsIDEpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnLW1zLXRyYW5zZm9ybSc6ICdtYXRyaXgoMSwgMCwgMCwgMSwgJyArIHggKyAnLCAnICsgeSArICcpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2xlZnQnOiB4ICsgJ3B4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAndG9wJzogeSArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2ZpeGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogZVdpZHRoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gZHJhZ1RvU2Nyb2xsKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2Nyb2xsWCA9IDAsIHNjcm9sbFkgPSAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vZmZzZXQoKSB8fCB7bGVmdDogMCwgdG9wOiAwfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaG9yaXpvbnRhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyTGVmdCA9IG9mZnNldChzY3JvbGxDb250YWluZXIpLmxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyV2lkdGggPSBzY3JvbGxDb250YWluZXIuaW5uZXJXaWR0aCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclJpZ2h0ID0gY29udGFpbmVyTGVmdCArIGNvbnRhaW5lcldpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoX214IC0gY29udGFpbmVyTGVmdCkgPCBhY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxYID0gLXNjcm9sbERpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKGNvbnRhaW5lclJpZ2h0IC0gX214KSA8IGFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFggPSBzY3JvbGxEaXN0YW5jZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZlcnRpY2FsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3AgPSBvZmZzZXQoc2Nyb2xsQ29udGFpbmVyKS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVySGVpZ2h0ID0gc2Nyb2xsQ29udGFpbmVyLmlubmVySGVpZ2h0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gY29udGFpbmVyVG9wICsgY29udGFpbmVySGVpZ2h0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoX215IC0gY29udGFpbmVyVG9wKSA8IGFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFkgPSAtc2Nyb2xsRGlzdGFuY2UgKyAzMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKChjb250YWluZXJCb3R0b20gLSBfbXkpIDwgYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWSA9IHNjcm9sbERpc3RhbmNlIC0gMzA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbFggIT09IDAgfHwgc2Nyb2xsWSAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsTGVmdCA9IHNjcm9sbENvbnRhaW5lci5zY3JvbGxMZWZ0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsVG9wID0gc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci5zY3JvbGxMZWZ0KGNvbnRhaW5lclNjcm9sbExlZnQgKyBzY3JvbGxYKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgc2Nyb2xsWSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcERyb3AnLCBcclxuICAgICAgICBmdW5jdGlvbiAoJHBhcnNlLCAkdGltZW91dCwgJHdpbmRvdywgJGRvY3VtZW50LCBwaXBEcmFnZ2FibGUpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGU6IGFueSwgZWxlbWVudCwgYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudmFsdWUgPSBhdHRycy5waXBEcm9wO1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuaXNUb3VjaGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBfbGFzdERyb3BUb3VjaCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB2YXIgX215aWQgPSBzY29wZS4kaWQ7XHJcbiAgICAgICAgICAgICAgICB2YXIgX2Ryb3BFbmFibGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJvcENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyb3BTdWNjZXNzKTsvLyB8fCBmdW5jdGlvbigpe307XHJcbiAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3RhcnRDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RhcnQpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N0b3BDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RvcCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgb25EcmFnTW92ZUNhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdNb3ZlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGF0dHJzLnBpcERyb3AsIG9uRW5hYmxlQ2hhbmdlKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95Jywgb25EZXN0cm95KTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTpzdGFydCcsIG9uRHJhZ1N0YXJ0KTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTptb3ZlJywgb25EcmFnTW92ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6ZW5kJywgb25EcmFnRW5kKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRlc3Ryb3koZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkVuYWJsZUNoYW5nZShuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kcm9wRW5hYmxlZCA9IG5ld1ZhbDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdTdGFydChldnQsIG9iaikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX2Ryb3BFbmFibGVkKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBpc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMucGlwRHJhZ1N0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N0YXJ0Q2FsbGJhY2soc2NvcGUsIHskZGF0YTogb2JqLmRhdGEsICRldmVudDogb2JqfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdNb3ZlKGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJvcEVuYWJsZWQpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGlzVG91Y2hpbmcob2JqLngsIG9iai55LCBvYmouZWxlbWVudCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5waXBEcmFnTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdNb3ZlQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogb2JqLmRhdGEsICRldmVudDogb2JqfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdFbmQoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBkb24ndCBsaXN0ZW4gdG8gZHJvcCBldmVudHMgaWYgdGhpcyBpcyB0aGUgZWxlbWVudCBiZWluZyBkcmFnZ2VkXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSB1cGRhdGUgdGhlIHN0eWxlcyBhbmQgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJvcEVuYWJsZWQgfHwgX215aWQgPT09IG9iai51aWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlRHJhZ1N0eWxlcyhmYWxzZSwgb2JqLmVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjYWxsIHRoZSBwaXBEcmFnZ2FibGUgcGlwRHJhZ1N1Y2Nlc3MgZWxlbWVudCBjYWxsYmFja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqLmNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmouY2FsbGJhY2sob2JqKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLnBpcERyb3BTdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25Ecm9wQ2FsbGJhY2soc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IG9iai5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IG9iaixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRhcmdldDogc2NvcGUuJGV2YWwoc2NvcGUudmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLnBpcERyYWdTdG9wKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N0b3BDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBvYmouZGF0YSwgJGV2ZW50OiBvYmp9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVEcmFnU3R5bGVzKGZhbHNlLCBvYmouZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaXNUb3VjaGluZyhtb3VzZVgsIG1vdXNlWSwgZHJhZ0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdG91Y2hpbmcgPSBoaXRUZXN0KG1vdXNlWCwgbW91c2VZKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5pc1RvdWNoaW5nID0gdG91Y2hpbmc7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvdWNoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9sYXN0RHJvcFRvdWNoID0gZWxlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlRHJhZ1N0eWxlcyh0b3VjaGluZywgZHJhZ0VsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0b3VjaGluZztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGVEcmFnU3R5bGVzKHRvdWNoaW5nLCBkcmFnRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0b3VjaGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnRWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX2xhc3REcm9wVG91Y2ggPT0gZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbGFzdERyb3BUb3VjaCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnLWVudGVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdFbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1vdmVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBoaXRUZXN0KHgsIHkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYm91bmRzID0gZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB4IC09ICRkb2N1bWVudFswXS5ib2R5LnNjcm9sbExlZnQgKyAkZG9jdW1lbnRbMF0uZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgeSAtPSAkZG9jdW1lbnRbMF0uYm9keS5zY3JvbGxUb3AgKyAkZG9jdW1lbnRbMF0uZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geCA+PSBib3VuZHMubGVmdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiB4IDw9IGJvdW5kcy5yaWdodFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiB5IDw9IGJvdW5kcy5ib3R0b21cclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgeSA+PSBib3VuZHMudG9wO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcERyYWdDbG9uZScsIGZ1bmN0aW9uICgkcGFyc2UsICR0aW1lb3V0LCBwaXBEcmFnZ2FibGUpIHtcclxuICAgIC8vICAgIHJldHVybiB7XHJcbiAgICAvLyAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgIC8vICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAvLyAgICAgICAgICAgIHZhciBpbWcsIF9hbGxvd0Nsb25lID0gdHJ1ZTtcclxuICAgIC8vICAgICAgICAgICAgdmFyIF9kcmFnT2Zmc2V0ID0gbnVsbDtcclxuICAgIC8vICAgICAgICAgICAgc2NvcGUuY2xvbmVkRGF0YSA9IHt9O1xyXG4gICAgLy8gICAgICAgICAgICBpbml0aWFsaXplKCk7XHJcbiAgICAvLyAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgICAgICBpbWcgPSBlbGVtZW50LmZpbmQoJ2ltZycpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBpbWcuYXR0cignZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICByZXNldCgpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG4gICAgLy8gICAgICAgICAgICB9XHJcbi8vXHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lcnNcclxuLy9cclxuICAgIC8vICAgICAgICAgICAgICAgIGlmICghZW5hYmxlKXJldHVybjtcclxuICAgIC8vICAgICAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAvLyAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTpzdGFydCcsIG9uRHJhZ1N0YXJ0KTtcclxuICAgIC8vICAgICAgICAgICAgICAgIHNjb3BlLiRvbignZHJhZ2dhYmxlOm1vdmUnLCBvbkRyYWdNb3ZlKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIHNjb3BlLiRvbignZHJhZ2dhYmxlOmVuZCcsIG9uRHJhZ0VuZCk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBwcmV2ZW50Q29udGV4dE1lbnUoKTtcclxuLy9cclxuICAgIC8vICAgICAgICAgICAgfVxyXG5cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gcHJldmVudENvbnRleHRNZW51KCkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgLy8gIGVsZW1lbnQub2ZmKCdtb3VzZWRvd24gdG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLCBhYnNvcmJFdmVudF8pO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaW1nLm9mZignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgYWJzb3JiRXZlbnRfKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIC8vICBlbGVtZW50Lm9uKCdtb3VzZWRvd24gdG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLCBhYnNvcmJFdmVudF8pO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaW1nLm9uKCdtb3VzZWRvd24gdG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLCBhYnNvcmJFdmVudF8pO1xyXG4gICAgLy8gICAgICAgICAgICB9XHJcblxyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdTdGFydChldnQsIG9iaiwgZWxtKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBfYWxsb3dDbG9uZSA9IHRydWU7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQob2JqLmRhdGEuYWxsb3dDbG9uZSkpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICBfYWxsb3dDbG9uZSA9IG9iai5kYXRhLmFsbG93Q2xvbmU7XHJcbiAgICAvLyAgICAgICAgICAgICAgICB9XHJcbiAgICAvLyAgICAgICAgICAgICAgICBpZiAoX2FsbG93Q2xvbmUpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5jbG9uZWREYXRhID0gb2JqLmRhdGE7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3MoJ3dpZHRoJywgb2JqLmVsZW1lbnRbMF0ub2Zmc2V0V2lkdGgpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKCdoZWlnaHQnLCBvYmouZWxlbWVudFswXS5vZmZzZXRIZWlnaHQpO1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIG1vdmVFbGVtZW50KG9iai50eCwgb2JqLnR5KTtcclxuICAgIC8vICAgICAgICAgICAgICAgIH1cclxuLy9cclxuICAgIC8vICAgICAgICAgICAgfVxyXG5cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnTW92ZShldnQsIG9iaikge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaWYgKF9hbGxvd0Nsb25lKSB7XHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgX3R4ID0gb2JqLnR4ICsgb2JqLmRyYWdPZmZzZXQubGVmdDtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICBfdHkgPSBvYmoudHkgKyBvYmouZHJhZ09mZnNldC50b3A7XHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgbW92ZUVsZW1lbnQoX3R4LCBfdHkpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgfVxyXG4gICAgLy8gICAgICAgICAgICB9XHJcblxyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdFbmQoZXZ0LCBvYmopIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIC8vbW92ZUVsZW1lbnQob2JqLnR4LG9iai50eSk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBpZiAoX2FsbG93Q2xvbmUpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICByZXNldCgpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgfVxyXG4gICAgLy8gICAgICAgICAgICB9XHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIHJlc2V0KCkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe2xlZnQ6IDAsIHRvcDogMCwgcG9zaXRpb246ICdmaXhlZCcsICd6LWluZGV4JzogLTEsIHZpc2liaWxpdHk6ICdoaWRkZW4nfSk7XHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIG1vdmVFbGVtZW50KHgsIHkpIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06ICdtYXRyaXgzZCgxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAnICsgeCArICcsICcgKyB5ICsgJywgMCwgMSknLFxyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICd6LWluZGV4JzogOTk5OTksXHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAndmlzaWJsZScsXHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgJy13ZWJraXQtdHJhbnNmb3JtJzogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgJy1tcy10cmFuc2Zvcm0nOiAnbWF0cml4KDEsIDAsIDAsIDEsICcgKyB4ICsgJywgJyArIHkgKyAnKSdcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICAvLyxtYXJnaW46ICcwJyAgZG9uJ3QgbW9ua2V5IHdpdGggdGhlIG1hcmdpbixcclxuICAgIC8vICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgLy8gICAgICAgICAgICB9XHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIGFic29yYkV2ZW50XyhldmVudCkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgdmFyIGUgPSBldmVudDsvLy5vcmlnaW5hbEV2ZW50O1xyXG4gICAgLy8gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCAmJiBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbiAmJiBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgLy8gICAgICAgICAgICB9XHJcbi8vXHJcbiAgICAvLyAgICAgICAgfVxyXG4gICAgLy8gICAgfTtcclxuICAgIC8vfSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcFByZXZlbnREcmFnJywgZnVuY3Rpb24gKCRwYXJzZSwgJHRpbWVvdXQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGU6IGFueSwgZWxlbWVudCwgYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoJ3BpcC1kcmFnZ2FibGUnLCAnZmFsc2UnKTtcclxuICAgICAgICAgICAgICAgICAgICB0b2dnbGVMaXN0ZW5lcnModHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdG9nZ2xlTGlzdGVuZXJzKGVuYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lcnNcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWVuYWJsZSlyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGxpc3RlbmVycy5cclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdtb3VzZWRvd24gdG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLCBhYnNvcmJFdmVudF8pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGFic29yYkV2ZW50XyhldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBlID0gZXZlbnQub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0ICYmIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbiAmJiBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBlLnJldHVyblZhbHVlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBDYW5jZWxEcmFnJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuZmluZCgnKicpLmF0dHIoJ3BpcC1jYW5jZWwtZHJhZycsICdwaXAtY2FuY2VsLWRyYWcnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxufSkoKTtcclxuXHJcbiIsIi8qKlxyXG4gKiBAZmlsZSBLZXlib2FyZCBuYXZpZ2F0aW9uIG92ZXIgZmV3IGZvY3VzYWJsZSBjb250cm9sc1xyXG4gKiBAY29weXJpZ2h0IERpZ2l0YWwgTGl2aW5nIFNvZnR3YXJlIENvcnAuIDIwMTQtMjAxNlxyXG4gKi9cclxuXHJcbi8qIGdsb2JhbCBhbmd1bGFyICovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciB0aGlzTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoXCJwaXBGb2N1c2VkXCIsIFtdKTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwRm9jdXNlZCcsIGZ1bmN0aW9uICgkdGltZW91dCwgJG1kQ29uc3RhbnQsICR3aW5kb3cpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXF1aXJlOiBcIj9uZ01vZGVsXCIsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGU6IGFueSwgJGVsZW1lbnQsICRhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY29udHJvbHMsIGNvbnRyb2xzTGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIHdpdGhIaWRkZW4gPSAkYXR0cnMucGlwV2l0aEhpZGRlbixcclxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5RGVsdGEgPSAwLjQsXHJcbiAgICAgICAgICAgICAgICAgICAgb3BhY2l0eUxpbWl0ID0gMC41LFxyXG4gICAgICAgICAgICAgICAgICAgIF9jb2xvcixcclxuICAgICAgICAgICAgICAgICAgICBmb2N1c2VkQ29sb3IgPSAkYXR0cnMucGlwRm9jdXNlZENvbG9yID8gJGF0dHJzLnBpcEZvY3VzZWRDb2xvciA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNPcGFjaXR5ID0gJGF0dHJzLnBpcEZvY3VzZWRPcGFjaXR5ID8gdG9Cb29sZWFuKCRhdHRycy5waXBGb2N1c2VkT3BhY2l0eSkgOiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAkdGltZW91dChpbml0KTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdrZXlkb3duJywga2V5ZG93bkxpc3RlbmVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCRhdHRycy5uZ01vZGVsLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoaW5pdCk7XHJcbiAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBDb252ZXJ0cyB2YWx1ZSBpbnRvIGJvb2xlYW5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvQm9vbGVhbih2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA9PSAnMScgfHwgdmFsdWUgPT0gJ3RydWUnO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiByZ2JhKGNvbG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZvY3VzZWRDb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9jdXNlZENvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyciA9IGNvbG9yLnNwbGl0KFwiKFwiKVsxXS5zcGxpdChcIilcIilbMF0uc3BsaXQoXCIsXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWFyciB8fCBhcnIubGVuZ3RoIDwgMykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJydcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCByZWQsIGJsdWUsIGdyZWVuLCBvcGFjaXR5O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5ID0gYXJyLmxlbmd0aCA9PSAzID8gMSA6IHBhcnNlRmxvYXQoYXJyWzNdKTtcclxuICAgICAgICAgICAgICAgICAgICByZWQgPSBhcnJbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgYmx1ZSA9IGFyclsxXTtcclxuICAgICAgICAgICAgICAgICAgICBncmVlbiA9IGFyclsyXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wYWNpdHkgPCBvcGFjaXR5TGltaXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eSArPSBvcGFjaXR5RGVsdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eSAtPSBvcGFjaXR5RGVsdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3JnYmEoJyArIHJlZCArICcsICcgKyBibHVlICsgJywgJyArIGdyZWVuICsgJywgJyArIG9wYWNpdHkgKyAnKSc7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2V0VGFiaW5kZXgoZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoJ3RhYmluZGV4JywgJzAnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0KCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RvciA9IHdpdGhIaWRkZW4gPyAnLnBpcC1mb2N1c2FibGUnIDogJy5waXAtZm9jdXNhYmxlOnZpc2libGUnO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzID0gJGVsZW1lbnQuZmluZChzZWxlY3Rvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbHNMZW5ndGggPSBjb250cm9scy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIG5lZWRlZCBldmVudCBsaXN0ZW5lcnNcclxuICAgICAgICAgICAgICAgICAgICBjb250cm9scy5vbignZm9jdXMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1mb2N1c2VkLWNvbnRhaW5lcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNPcGFjaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZWxsID0gYW5ndWxhci5lbGVtZW50KCQodGhpcylbMF0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jb2xvciA9ICQodGhpcykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIF9jb2xvciA9ICR3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSgkKHRoaXMpWzBdLCBudWxsKS5iYWNrZ3JvdW5kQ29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmNzcygnYmFja2dyb3VuZENvbG9yJywgcmdiYShfY29sb3IpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuYWRkQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuYWRkQ2xhc3MoJ21kLWZvY3VzZWQgbWQtZm9jdXNlZC1vcGFjaXR5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRhYmluZGV4KGFuZ3VsYXIuZWxlbWVudCgkKHRoaXMpWzBdKSwgJzAnKTtcclxuICAgICAgICAgICAgICAgICAgICB9KS5vbignZm9jdXNvdXQnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc09wYWNpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICQodGhpcykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCBfY29sb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmVDbGFzcygnbWQtZm9jdXNlZCBtZC1mb2N1c2VkLW9wYWNpdHknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGFiaW5kZXgoYW5ndWxhci5lbGVtZW50KCQodGhpcylbMF0pLCAnMScpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGtleWRvd25MaXN0ZW5lcihlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleUNvZGUgPSBlLndoaWNoIHx8IGUua2V5Q29kZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBjb250cm9sIGtleUNvZGVcclxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5MRUZUX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuVVBfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1cpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jcmVtZW50ID0gKGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHwga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSA/IDEgOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vdmVUb0NvbnRyb2wgPSBjb250cm9scy5pbmRleChjb250cm9scy5maWx0ZXIoXCIubWQtZm9jdXNlZFwiKSkgKyBpbmNyZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1vdmUgZm9jdXMgdG8gbmV4dCBjb250cm9sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtb3ZlVG9Db250cm9sID49IDAgJiYgbW92ZVRvQ29udHJvbCA8IGNvbnRyb2xzTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sc1ttb3ZlVG9Db250cm9sXS5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxufSkoKTtcclxuXHJcbiIsIi8qKlxyXG4gKiBAZmlsZSBJbmZpbml0ZSBzY3JvbGxpbmcgYmVoYXZpb3JcclxuICogQGRlc2NyaXB0aW9uXHJcbiAqIE1vZGlmaWVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL3Nyb3plL25nSW5maW5pdGVTY3JvbGxcclxuICogQGNvcHlyaWdodCBEaWdpdGFsIExpdmluZyBTb2Z0d2FyZSBDb3JwLiAyMDE0LTIwMTZcclxuICovXHJcblxyXG4vKiBnbG9iYWwgYW5ndWxhciAqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwSW5maW5pdGVTY3JvbGxcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBJbmZpbml0ZVNjcm9sbCcsIFxyXG4gICAgICAgIGZ1bmN0aW9uKCRyb290U2NvcGUsICR3aW5kb3csICRpbnRlcnZhbCwgJHBhcnNlKSB7XHJcbiAgICAgICAgICAgIHZhciBUSFJPVFRMRV9NSUxMSVNFQ09ORFMgPSA1MDA7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgICAgICBwaXBJbmZpbml0ZVNjcm9sbDogJyYnLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbENvbnRhaW5lcjogJz0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbERpc3RhbmNlOiAnPScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwU2Nyb2xsRGlzYWJsZWQ6ICc9JyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbTogJz0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbExpc3RlbkZvckV2ZW50OiAnQCdcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGU6IGFueSwgJGVsZW1lbnQsICRhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja1doZW5FbmFibGVkID0gbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbW1lZGlhdGVDaGVjayA9IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbERpc3RhbmNlID0gbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRW5hYmxlZCA9IG51bGwsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lciA9IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZURvY3VtZW50Qm90dG9tID0gZmFsc2UsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3dFbGVtZW50ID0gYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhlaWdodChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50WzBdIHx8IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hTihlbGVtZW50Lm9mZnNldEhlaWdodCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvZmZzZXRUb3AoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0IHx8IGVsZW1lbnQuY3NzKCdub25lJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgKyBwYWdlWU9mZnNldChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBwYWdlWU9mZnNldChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50WzBdIHx8IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hTih3aW5kb3cucGFnZVlPZmZzZXQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkNvbnRhaW5lclNjcm9sbCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20sIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyVG9wT2Zmc2V0LCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20sIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtYWluaW5nLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZFNjcm9sbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxDb250YWluZXIgPT09IHdpbmRvd0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IGhlaWdodChzY3JvbGxDb250YWluZXIpICsgcGFnZVlPZmZzZXQoc2Nyb2xsQ29udGFpbmVyWzBdLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gb2Zmc2V0VG9wKCRlbGVtZW50KSArIGhlaWdodCgkZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBoZWlnaHQoc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2Zmc2V0VG9wKHNjcm9sbENvbnRhaW5lcikgIT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCA9IG9mZnNldFRvcChzY3JvbGxDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSA9IG9mZnNldFRvcCgkZWxlbWVudCkgLSBjb250YWluZXJUb3BPZmZzZXQgKyBoZWlnaHQoJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodXNlRG9jdW1lbnRCb3R0b20pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSBoZWlnaHQoKCRlbGVtZW50WzBdLm93bmVyRG9jdW1lbnQgfHwgKDxhbnk+JGVsZW1lbnRbMF0pLmRvY3VtZW50KS5kb2N1bWVudEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1haW5pbmcgPSBlbGVtZW50Qm90dG9tIC0gY29udGFpbmVyQm90dG9tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRTY3JvbGwgPSByZW1haW5pbmcgPD0gaGVpZ2h0KHNjcm9sbENvbnRhaW5lcikgKiBzY3JvbGxEaXN0YW5jZSArIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2hvdWxkU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1doZW5FbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxFbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS4kJHBoYXNlIHx8ICRyb290U2NvcGUuJCRwaGFzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnBpcEluZmluaXRlU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS4kYXBwbHkoJHNjb3BlLnBpcEluZmluaXRlU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hlY2tXaGVuRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFRIUk9UVExFX01JTExJU0VDT05EUyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ29udGFpbmVyU2Nyb2xsID0gXy50aHJvdHRsZShvbkNvbnRhaW5lclNjcm9sbCwgVEhST1RUTEVfTUlMTElTRUNPTkRTKTsgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyLnVuYmluZCgnc2Nyb2xsJywgb25Db250YWluZXJTY3JvbGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaGFuZGxlU2Nyb2xsRGlzdGFuY2Uodikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2Nyb2xsRGlzdGFuY2UgPSBwYXJzZUZsb2F0KHYpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBTY3JvbGxEaXN0YW5jZScsIGhhbmRsZVNjcm9sbERpc3RhbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY3JvbGxEaXN0YW5jZSgkc2NvcGUucGlwU2Nyb2xsRGlzdGFuY2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbERpc2FibGVkKHYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsRW5hYmxlZCA9ICF2O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsRW5hYmxlZCAmJiBjaGVja1doZW5FbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1doZW5FbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb25Db250YWluZXJTY3JvbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsRGlzYWJsZWQnLCBoYW5kbGVTY3JvbGxEaXNhYmxlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsRGlzYWJsZWQoJHNjb3BlLnBpcFNjcm9sbERpc2FibGVkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20odikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlRG9jdW1lbnRCb3R0b20gPSB2O1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20nLCBoYW5kbGVTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20oJHNjb3BlLnBpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hhbmdlQ29udGFpbmVyKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsQ29udGFpbmVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci51bmJpbmQoJ3Njcm9sbCcsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gbmV3Q29udGFpbmVyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzY3JvbGxDb250YWluZXIuYmluZCgnc2Nyb2xsJywgb25Db250YWluZXJTY3JvbGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ29udGFpbmVyKHdpbmRvd0VsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUucGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbigkc2NvcGUucGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbENvbnRhaW5lcihuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChuZXdDb250YWluZXIgPT0gbnVsbCkgfHwgbmV3Q29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld0NvbnRhaW5lci5hcHBlbmQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChuZXdDb250YWluZXJbbmV3Q29udGFpbmVyLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbmV3Q29udGFpbmVyID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29udGFpbmVyID0gJGVsZW1lbnQucGFyZW50cygpLmZpbmQobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPSBudWxsICYmICghQXJyYXkuaXNBcnJheShuZXdDb250YWluZXIpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoQXJyYXkuaXNBcnJheShuZXdDb250YWluZXIpICYmIG5ld0NvbnRhaW5lci5sZW5ndGggPiAwKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGFuZ2VDb250YWluZXIobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcGlwLXNjcm9sbC1jb250YWluZXIgYXR0cmlidXRlLlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsQ29udGFpbmVyJywgZnVuY3Rpb24gKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyICE9PSBzY3JvbGxDb250YWluZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY3JvbGxDb250YWluZXIobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVTY3JvbGxDb250YWluZXIoJHNjb3BlLnBpcFNjcm9sbENvbnRhaW5lciB8fCBbXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRhdHRycy5waXBTY3JvbGxQYXJlbnQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VDb250YWluZXIoYW5ndWxhci5lbGVtZW50KCRlbGVtZW50LnBhcmVudCgpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkYXR0cnMucGlwU2Nyb2xJbW1lZGlhdGVDaGVjayAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltbWVkaWF0ZUNoZWNrID0gJHNjb3BlLiRldmFsKCRhdHRycy5waXBTY3JvbEltbWVkaWF0ZUNoZWNrKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRpbnRlcnZhbCgoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbW1lZGlhdGVDaGVjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9uQ29udGFpbmVyU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KSwgMCwgMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICApO1xyXG5cclxufSkoKTtcclxuXHJcbiIsIi8qKlxyXG4gKiBAZmlsZSBLZXlib2FyZCBuYXZpZ2F0aW9uIHdpdGggc2Nyb2xsaW5nIG92ZXIgbm9uLWZvY3VzYWJsZSBjb250cm9sc1xyXG4gKiBAY29weXJpZ2h0IERpZ2l0YWwgTGl2aW5nIFNvZnR3YXJlIENvcnAuIDIwMTQtMjAxNlxyXG4gKi9cclxuXHJcbi8qIGdsb2JhbCBhbmd1bGFyICovXHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciB0aGlzTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoXCJwaXBTZWxlY3RlZFwiLCBbXSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcFNlbGVjdGVkJyxmdW5jdGlvbiAoJHBhcnNlLCAkbWRDb25zdGFudCwgJHRpbWVvdXQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGU6IGFueSwgJGVsZW1lbnQsICRhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICBpbmRleEdldHRlciA9ICRhdHRycy5waXBTZWxlY3RlZCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0ZWQpIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpbmRleFNldHRlciA9IGluZGV4R2V0dGVyID8gaW5kZXhHZXR0ZXIuYXNzaWduIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpZEdldHRlciA9ICRhdHRycy5waXBTZWxlY3RlZElkID8gJHBhcnNlKCRhdHRycy5waXBTZWxlY3RlZElkKSA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaWRTZXR0ZXIgPSBpZEdldHRlciA/IGlkR2V0dGVyLmFzc2lnbiA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0KSA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgZW50ZXJTcGFjZUdldHRlciA9ICRhdHRycy5waXBFbnRlclNwYWNlUHJlc3MgPyAkcGFyc2UoJGF0dHJzLnBpcEVudGVyU3BhY2VQcmVzcykgOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vU2Nyb2xsID0gdG9Cb29sZWFuKCRhdHRycy5waXBOb1Njcm9sbCksXHJcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZpZXIgPSB0b0Jvb2xlYW4oJGF0dHJzLnBpcFNraXBIaWRkZW4pID8gJzp2aXNpYmxlJyA6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZSA9IHRvQm9vbGVhbigkYXR0cnMucGlwVHJlZUxpc3QpID8gJy5waXAtc2VsZWN0YWJsZS10cmVlJyA6ICcucGlwLXNlbGVjdGFibGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleEdldHRlcigkc2NvcGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRFbGVtZW50VGFiaW5leCA9ICRlbGVtZW50LmF0dHIoJ3RhYmluZGV4JyksXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwU2VsZWN0ZWRXYXRjaCA9ICRhdHRycy5waXBTZWxlY3RlZFdhdGNoLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzU2Nyb2xsZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBTZXQgdGFiaW5kZXggaWYgaXQncyBub3Qgc2V0IHlldFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCBjdXJyZW50RWxlbWVudFRhYmluZXggfHwgMCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gV2F0Y2ggc2VsZWN0ZWQgaXRlbSBpbmRleFxyXG4gICAgICAgICAgICAgICAgaWYgKCF0b0Jvb2xlYW4oJGF0dHJzLnBpcFRyZWVMaXN0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goaW5kZXhHZXR0ZXIsIGZ1bmN0aW9uKG5ld1NlbGVjdGVkSW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbUluZGV4OiBuZXdTZWxlY3RlZEluZGV4fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goaWRHZXR0ZXIsIGZ1bmN0aW9uKG5ld1NlbGVjdGVkSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtpdGVtSWQ6IG5ld1NlbGVjdGVkSWQsIHJhaXNlRXZlbnQ6IHRydWV9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gV2F0Y2ggcmVzeW5jIHNlbGVjdGlvblxyXG4gICAgICAgICAgICAgICAgaWYgKHBpcFNlbGVjdGVkV2F0Y2gpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKHBpcFNlbGVjdGVkV2F0Y2gsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEZWxheSB1cGRhdGUgdG8gYWxsb3cgbmctcmVwZWF0IHRvIHVwZGF0ZSBET01cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleEdldHRlcigkc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbUluZGV4OiBzZWxlY3RlZEluZGV4fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gU2VsZWN0IGl0ZW0gZGVmaW5lZCBieSBpbmRleFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbUluZGV4OiBzZWxlY3RlZEluZGV4LCBpdGVtczogJGVsZW1lbnQuZmluZChjbGFzc05hbWUpfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQ29udmVydHMgdmFsdWUgaW50byBib29sZWFuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b0Jvb2xlYW4odmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPT0gJzEnIHx8IHZhbHVlID09ICd0cnVlJztcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIEZ1bmN0aW9ucyBhbmQgbGlzdGVuZXJzXHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2VsZWN0SXRlbShpdGVtUGFyYW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzU2Nyb2xsZWQpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbUluZGV4ID0gaXRlbVBhcmFtcy5pdGVtSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JZCA9IGl0ZW1QYXJhbXMuaXRlbUlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcyA9IGl0ZW1QYXJhbXMuaXRlbXMgfHwgJGVsZW1lbnQuZmluZChjbGFzc05hbWUgKyBtb2RpZmllciksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zTGVuZ3RoID0gaXRlbXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtUGFyYW1zLml0ZW0pIHJldHVybiBpdGVtUGFyYW1zLml0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUluZGV4ID09PSB1bmRlZmluZWQgJiYgaXRlbUluZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleCA9IGl0ZW1zLmluZGV4KGl0ZW1zLmZpbHRlcignW3BpcC1pZD0nICsgaXRlbUlkICsgJ10nKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUluZGV4ID49IDAgJiYgaXRlbUluZGV4IDwgaXRlbXNMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXNbaXRlbUluZGV4XVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50ID0gaXRlbVBhcmFtcy5yYWlzZUV2ZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSkucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkIG1kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IGFuZ3VsYXIuZWxlbWVudChpdGVtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzZWxlY3RlZCBtZC1mb2N1c2VkJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5mb2N1cygpOyAvLyB0b2RvINGB0LTQstC40LPQsNC10YIg0YHQv9C40YHQvtC6INGC0YPRgiwg0L3QsCDQv9C10YDQstC+0Lwg0L/RgNC+0YXQvtC00LVcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFub1Njcm9sbCkgc2Nyb2xsVG9JdGVtKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmFpc2VFdmVudCkgZGVmaW5lU2VsZWN0ZWRJbmRleChpdGVtcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBkZWZpbmVTZWxlY3RlZEluZGV4KGl0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZFNlbGVjdGVkSW5kZXggPSBzZWxlY3RlZEluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgaXRlbXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkKGl0ZW1zW2luZGV4XSkuaGFzQ2xhc3MoJ3NlbGVjdGVkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhlY3V0ZSBjYWxsYmFjayB0byBub3RpZnkgYWJvdXQgaXRlbSBzZWxlY3RcclxuICAgICAgICAgICAgICAgICAgICBpZiAob2xkU2VsZWN0ZWRJbmRleCAhPSBzZWxlY3RlZEluZGV4ICYmIHNlbGVjdGVkSW5kZXggIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkodXBkYXRlSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkob25TZWxlY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlSW5kZXgoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZEl0ZW0gPSBhbmd1bGFyLmVsZW1lbnQoaXRlbXNbc2VsZWN0ZWRJbmRleF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJZCA9IHNlbGVjdGVkSXRlbS5hdHRyKCdwaXAtaWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleFNldHRlcikgaW5kZXhTZXR0ZXIoJHNjb3BlLCBzZWxlY3RlZEluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkU2V0dGVyKSBpZFNldHRlcigkc2NvcGUsIHNlbGVjdGVkSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvblNlbGVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uU2VsZWN0KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW1zW3NlbGVjdGVkSW5kZXhdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBzZWxlY3RlZEl0ZW0uYXR0cigncGlwLWlkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhbmdlR2V0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VHZXR0ZXIoJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IHNlbGVjdGVkSXRlbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6IHNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBzZWxlY3RlZElkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJbmRleDogc2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkSW5kZXg6IG9sZFNlbGVjdGVkSW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2Nyb2xsVG9JdGVtKCRpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vU2Nyb2xsKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3AgPSAkZWxlbWVudC5vZmZzZXQoKS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9ICRlbGVtZW50LmhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBjb250YWluZXJUb3AgKyBjb250YWluZXJIZWlnaHQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1Ub3AgPSAkaXRlbS5vZmZzZXQoKS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1IZWlnaHQgPSAkaXRlbS5vdXRlckhlaWdodCh0cnVlKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUJvdHRvbSA9IGl0ZW1Ub3AgKyBpdGVtSGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJTY3JvbGxUb3AgPSAkZWxlbWVudC5zY3JvbGxUb3AoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzU2Nyb2xsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzU2Nyb2xsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRhaW5lclRvcCA+IGl0ZW1Ub3ApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIGl0ZW1Ub3AgLSBjb250YWluZXJUb3ApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChjb250YWluZXJCb3R0b20gPCBpdGVtQm90dG9tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LnNjcm9sbFRvcChjb250YWluZXJTY3JvbGxUb3AgKyBpdGVtQm90dG9tIC0gY29udGFpbmVyQm90dG9tKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5vbignY2xpY2sgdG91Y2hzdGFydCcsIGNsYXNzTmFtZSwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbTogZXZlbnQuY3VycmVudFRhcmdldCwgcmFpc2VFdmVudDogdHJ1ZX0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlDb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGNvbnRyb2wga2V5Q29kZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkVOVEVSIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuU1BBQ0UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudGVyU3BhY2VHZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGVyU3BhY2VHZXR0ZXIoJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiBzZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtOiAkZWxlbWVudC5maW5kKCcuc2VsZWN0ZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkxFRlRfQVJST1cgfHwga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IG5leHQgc2VsZWN0YWJsZSBjb250cm9sIGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpdGVtcyA9ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lICsgbW9kaWZpZXIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jID0gKGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHwga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSA/IDEgOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGVkSW5kZXggPSBzZWxlY3RlZEluZGV4ICsgaW5jO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG5leHQgY29udHJvbCBhcyBzZWxlY3RlZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtpdGVtSW5kZXg6IG5ld1NlbGVjdGVkSW5kZXgsIGl0ZW1zOiBpdGVtcywgcmFpc2VFdmVudDogdHJ1ZX0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c2luJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hvb3NlIHNlbGVjdGVkIGVsZW1lbnRcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbSA9ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lICsgJy5zZWxlY3RlZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0uYWRkQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vdCBzZWxlY3RlZCBlbGVtZW50cyB0aGVuIHBpY2sgdGhlIGZpcnN0IG9uZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZEl0ZW0ubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleEdldHRlcigkc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcyA9ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lICsgbW9kaWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RJdGVtKHtpdGVtSW5kZXg6IHNlbGVjdGVkSW5kZXggfHwgMCwgaXRlbXM6IGl0ZW1zLCByYWlzZUV2ZW50OiB0cnVlfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2ZvY3Vzb3V0JywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuZmluZChjbGFzc05hbWUgKyAnLm1kLWZvY3VzZWQnICsgbW9kaWZpZXIpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbn0pKCk7XHJcblxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XHJcblxyXG4oZnVuY3Rpb24oKXtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwVW5zYXZlZENoYW5nZXNcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKFwicGlwVW5zYXZlZENoYW5nZXNcIiwgZnVuY3Rpb24gKCR3aW5kb3csICRyb290U2NvcGUpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0FFJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlJyxcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzTWVzc2FnZTogJ0BwaXBVbnNhdmVkQ2hhbmdlc01lc3NhZ2UnLFxyXG4gICAgICAgICAgICAgICAgYWZ0ZXJMZWF2ZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0FmdGVyTGVhdmUnLFxyXG4gICAgICAgICAgICAgICAgY2FuY2VsTGVhdmU6ICcmcGlwVW5zYXZlZENoYW5nZXNDYW5jZWxMZWF2ZSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlOiBhbnkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9uYmVmb3JldW5sb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS51bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJHJvdXRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS51bnNhdmVkQ2hhbmdlc01lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgdW5iaW5kRnVuYyA9ICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlKCkgJiYgISR3aW5kb3cuY29uZmlybSgkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRyb3V0aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oJHNjb3BlLmNhbmNlbExlYXZlKSAmJiAkc2NvcGUuY2FuY2VsTGVhdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oJHNjb3BlLmFmdGVyTGVhdmUpICYmICRzY29wZS5hZnRlckxlYXZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAkd2luZG93Lm9uYmVmb3JldW5sb2FkID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB1bmJpbmRGdW5jKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbn0pKCk7XHJcblxyXG4iXX0=