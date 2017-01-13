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
                var controls, controlsLength, withHidden = $attrs.pipWithHidden, opacityDelta = 0.4, opacityLimit = 0.5, _color, focusedColor = $attrs.pipFocusedColor ? $attrs.pipFocusedColor : null, reInit = $attrs.pipFocusedRebind ? $attrs.pipFocusedRebind : null, focusedTabindex = $attrs.pipFocusedTabindex ? parseInt($attrs.pipFocusedTabindex) || 0 : 0, isOpacity = $attrs.pipFocusedOpacity ? toBoolean($attrs.pipFocusedOpacity) : false;
                $timeout(init);
                $element.on('keydown', keydownListener);
                if ($attrs.ngModel) {
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmVoYXZpb3JzLnRzIiwic3JjL2RyYWdnYWJsZS9kcmFnZ2FibGUudHMiLCJzcmMvZm9jdXNlZC9mb2N1c2VkLnRzIiwic3JjL2luZmluaXRlX3Njcm9sbC9pbmZpbml0ZV9zY3JvbGwudHMiLCJzcmMvc2VsZWN0ZWQvc2VsZWN0ZWQudHMiLCJzcmMvdW5zYXZlZF9jaGFuZ2VzL3Vuc2F2ZWRfY2hhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ09BLENBQUM7SUFDRyxZQUFZLENBQUM7SUFFYixPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtRQUMzQixZQUFZO1FBQ1osYUFBYTtRQUNiLG1CQUFtQjtRQUNuQixtQkFBbUI7UUFDbkIsY0FBYztLQUNqQixDQUFDLENBQUM7QUFFUCxDQUFDLENBQUMsRUFBRSxDQUFDOztBQ2hCTCxDQUFDO0lBQ0csWUFBWSxDQUFDO0lBRWIsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFcEQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUU7UUFFL0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxLQUFLO1lBQzlCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsQ0FBQztZQUVELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMs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QUFDLFVBQVUsRUFBRTtvQkFDbkIsT0FBTyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7b0JBQzlCLFVBQVUsRUFBRSxDQUFDO2dCQUNqQixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7U0FDSixDQUFDO0lBQ04sQ0FBQyxDQUFDLENBQUM7QUFFUCxDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIu+7vy8qKlxyXG4gKiBAZmlsZSBSZWdpc3RyYXRpb24gb2YgYWxsIFdlYlVJIGxpc3QgY29udHJvbHNcclxuICogQGNvcHlyaWdodCBEaWdpdGFsIExpdmluZyBTb2Z0d2FyZSBDb3JwLiAyMDE0LTIwMTZcclxuICovXHJcblxyXG4vKiBnbG9iYWwgYW5ndWxhciAqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgncGlwQmVoYXZpb3JzJywgW1xyXG4gICAgICAgICdwaXBGb2N1c2VkJyxcclxuICAgICAgICAncGlwU2VsZWN0ZWQnLFxyXG4gICAgICAgICdwaXBJbmZpbml0ZVNjcm9sbCcsXHJcbiAgICAgICAgJ3BpcFVuc2F2ZWRDaGFuZ2VzJyxcclxuICAgICAgICAncGlwRHJhZ2dhYmxlJ1xyXG4gICAgXSk7XHJcbiAgICBcclxufSkoKTsiLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XHJcblxyXG4oZnVuY3Rpb24gKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciB0aGlzTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuc2VydmljZSgncGlwRHJhZ2dhYmxlJywgZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xyXG4gICAgICAgIHNjb3BlLmlucHV0RXZlbnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50LnRvdWNoZXMpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQudG91Y2hlc1swXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL0NoZWNraW5nIGJvdGggaXMgbm90IHJlZHVuZGVudC4gSWYgb25seSBjaGVjayBpZiB0b3VjaGVzIGlzRGVmaW5lZCwgYW5ndWxhcmpzIGlzRGVmbmllZCB3aWxsIHJldHVybiBlcnJvciBhbmQgc3RvcCB0aGUgcmVtYWluaW5nIHNjcmlwdHkgaWYgZXZlbnQub3JpZ2luYWxFdmVudCBpcyBub3QgZGVmaW5lZC5cclxuICAgICAgICAgICAgZWxzZSBpZiAoYW5ndWxhci5pc0RlZmluZWQoZXZlbnQub3JpZ2luYWxFdmVudCkgJiYgYW5ndWxhci5pc0RlZmluZWQoZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1swXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZXZlbnQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwRHJhZycsXHJcbiAgICAgICAgZnVuY3Rpb24gKCRyb290U2NvcGUsICRwYXJzZSwgJGRvY3VtZW50LCAkd2luZG93LCBwaXBEcmFnZ2FibGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuXHJcbiAgICAgICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlOiBhbnksIGVsZW1lbnQsIGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS52YWx1ZSA9IGF0dHJzLm5nRHJhZztcclxuICAgICAgICAgICAgICAgICAgICB2YXIgTE9OR19QUkVTUyA9IDUwOyAvLyA1MG1zIGZvciBsb25ncHJlc3NcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb2Zmc2V0LCBfY2VudGVyQW5jaG9yID0gZmFsc2UsIF9teCwgX215LCBfdHgsIF90eSwgX21yeCwgX21yeTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX2hhc1RvdWNoID0gKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdykgfHwgKDxhbnk+d2luZG93KS5Eb2N1bWVudFRvdWNoOyAvLyAmJiBkb2N1bWVudCBpbnN0YW5jZW9mIERvY3VtZW50VG91Y2g7IC8vIERvY3VtZW50VG91Y2ggaXMgbm90IGRlZmluZWQhXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9wcmVzc0V2ZW50cyA9ICd0b3VjaHN0YXJ0IG1vdXNlZG93bic7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9tb3ZlRXZlbnRzID0gJ3RvdWNobW92ZSBtb3VzZW1vdmUnO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfcmVsZWFzZUV2ZW50cyA9ICd0b3VjaGVuZCBtb3VzZXVwJztcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX2RyYWdIYW5kbGU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRvIGlkZW50aWZ5IHRoZSBlbGVtZW50IGluIG9yZGVyIHRvIHByZXZlbnQgZ2V0dGluZyBzdXBlcmZsb3VzIGV2ZW50cyB3aGVuIGEgc2luZ2xlIGVsZW1lbnQgaGFzIGJvdGggZHJhZyBhbmQgZHJvcCBkaXJlY3RpdmVzIG9uIGl0LlxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfbXlpZCA9IHNjb3BlLiRpZDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX2RhdGEgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX2RyYWdPZmZzZXQgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgX2RyYWdFbmFibGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfcHJlc3NUaW1lciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZWxlbWVudFN0eWxlOiBhbnkgPSB7fTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N0YXJ0Q2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N0YXJ0KSB8fCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdG9wQ2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N0b3ApIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N1Y2Nlc3NDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3VjY2VzcykgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYWxsb3dUcmFuc2Zvcm0gPSBhbmd1bGFyLmlzRGVmaW5lZChhdHRycy5hbGxvd1RyYW5zZm9ybSkgPyBzY29wZS4kZXZhbChhdHRycy5hbGxvd1RyYW5zZm9ybSkgOiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdldERyYWdEYXRhID0gJHBhcnNlKGF0dHJzLnBpcERyYWdEYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmVydGljYWxTY3JvbGwgPSB0b0Jvb2xlYW4oYXR0cnMucGlwVmVydGljYWxTY3JvbGwpIHx8IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvcml6b250YWxTY3JvbGwgPSB0b0Jvb2xlYW4oYXR0cnMucGlwSG9yaXpvbnRhbFNjcm9sbCkgfHwgdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZhdGlvbkRpc3RhbmNlID0gcGFyc2VGbG9hdChhdHRycy5waXBBY3RpdmF0aW9uRGlzdGFuY2UpIHx8IDc1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxEaXN0YW5jZSA9IHBhcnNlRmxvYXQoYXR0cnMucGlwU2Nyb2xsRGlzdGFuY2UpIHx8IDUwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxQYXJlbnQgPSBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXJHZXR0ZXIgPSAkcGFyc2UoYXR0cnMucGlwU2Nyb2xsQ29udGFpbmVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZGVyZWdpc3RyYXRpb24gZnVuY3Rpb24gZm9yIG1vdXNlIG1vdmUgZXZlbnRzIGluICRyb290U2NvcGUgdHJpZ2dlcmVkIGJ5IGpxTGl0ZSB0cmlnZ2VyIGhhbmRsZXJcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyID0gYW5ndWxhci5ub29wO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoJ3BpcC1kcmFnZ2FibGUnLCAnZmFsc2UnKTsgLy8gcHJldmVudCBuYXRpdmUgZHJhZ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayB0byBzZWUgaWYgZHJhZyBoYW5kbGUocykgd2FzIHNwZWNpZmllZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBxdWVyeVNlbGVjdG9yQWxsIGlzIGF2YWlsYWJsZSwgd2UgdXNlIHRoaXMgaW5zdGVhZCBvZiBmaW5kXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIEpRTGl0ZSBmaW5kIGlzIGxpbWl0ZWQgdG8gdGFnbmFtZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRyYWdIYW5kbGVzOiBhbnk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50WzBdLnF1ZXJ5U2VsZWN0b3JBbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdIYW5kbGVzID0gYW5ndWxhci5lbGVtZW50KGVsZW1lbnRbMF0ucXVlcnlTZWxlY3RvckFsbCgnW3BpcC1kcmFnLWhhbmRsZV0nKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnSGFuZGxlcyA9IGVsZW1lbnQuZmluZCgnW3BpcC1kcmFnLWhhbmRsZV0nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZHJhZ0hhbmRsZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZHJhZ0hhbmRsZSA9IGRyYWdIYW5kbGVzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgc2Nyb2xsIGNvbnRhaW5lclxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsUGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudC5wYXJlbnQoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXR0cnMucGlwU2Nyb2xsQ29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQoc2Nyb2xsQ29udGFpbmVyR2V0dGVyKHNjb3BlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQod2luZG93KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gdG9Cb29sZWFuKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA9PSAnMScgfHwgdmFsdWUgPT0gJ3RydWUnO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gdG9nZ2xlTGlzdGVuZXJzKGVuYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVuYWJsZSlyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95Jywgb25EZXN0cm95KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGF0dHJzLnBpcERyYWcsIG9uRW5hYmxlQ2hhbmdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGF0dHJzLnBpcENlbnRlckFuY2hvciwgb25DZW50ZXJBbmNob3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3aXJlIHVwIHRvdWNoIGV2ZW50c1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2RyYWdIYW5kbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhhbmRsZShzKSBzcGVjaWZpZWQsIHVzZSB0aG9zZSB0byBpbml0aWF0ZSBkcmFnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZHJhZ0hhbmRsZS5vbihfcHJlc3NFdmVudHMsIG9ucHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm8gaGFuZGxlKHMpIHNwZWNpZmllZCwgdXNlIHRoZSBlbGVtZW50IGFzIHRoZSBoYW5kbGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQub24oX3ByZXNzRXZlbnRzLCBvbnByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9oYXNUb3VjaCAmJiBlbGVtZW50WzBdLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT0gXCJpbWdcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5vbignbW91c2Vkb3duJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pOyAvLyBwcmV2ZW50IG5hdGl2ZSBkcmFnIGZvciBpbWFnZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkRlc3Ryb3koZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyhmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkVuYWJsZUNoYW5nZShuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZHJhZ0VuYWJsZWQgPSAobmV3VmFsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uQ2VudGVyQW5jaG9yKG5ld1ZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChuZXdWYWwpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NlbnRlckFuY2hvciA9IChuZXdWYWwgfHwgJ3RydWUnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGlzQ2xpY2thYmxlRWxlbWVudChldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuaXNEZWZpbmVkKGFuZ3VsYXIuZWxlbWVudChldnQudGFyZ2V0KS5hdHRyKFwicGlwLWNhbmNlbC1kcmFnXCIpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLypcclxuICAgICAgICAgICAgICAgICAgICAgKiBXaGVuIHRoZSBlbGVtZW50IGlzIGNsaWNrZWQgc3RhcnQgdGhlIGRyYWcgYmVoYXZpb3VyXHJcbiAgICAgICAgICAgICAgICAgICAgICogT24gdG91Y2ggZGV2aWNlcyBhcyBhIHNtYWxsIGRlbGF5IHNvIGFzIG5vdCB0byBwcmV2ZW50IG5hdGl2ZSB3aW5kb3cgc2Nyb2xsaW5nXHJcbiAgICAgICAgICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25wcmVzcyhldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJhZ0VuYWJsZWQpcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2xpY2thYmxlRWxlbWVudChldnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldnQudHlwZSA9PSBcIm1vdXNlZG93blwiICYmIGV2dC5idXR0b24gIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG8gbm90IHN0YXJ0IGRyYWdnaW5nIG9uIHJpZ2h0LWNsaWNrXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVFbGVtZW50U3R5bGVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2hhc1RvdWNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxQcmVzcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3ByZXNzVGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxQcmVzcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubG9uZ3ByZXNzKGV2dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBMT05HX1BSRVNTKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vbihfbW92ZUV2ZW50cywgY2FuY2VsUHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKF9yZWxlYXNlRXZlbnRzLCBjYW5jZWxQcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmxvbmdwcmVzcyhldnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gc2F2ZUVsZW1lbnRTdHlsZXMoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lbGVtZW50U3R5bGUubGVmdCA9IGVsZW1lbnQuY3NzKCdjc3MnKSB8fCAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZWxlbWVudFN0eWxlLnRvcCA9IGVsZW1lbnQuY3NzKCd0b3AnKSB8fCAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZWxlbWVudFN0eWxlLnBvc2l0aW9uID0gZWxlbWVudC5jc3MoJ3Bvc2l0aW9uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lbGVtZW50U3R5bGUud2lkdGggPSBlbGVtZW50LmNzcygnd2lkdGgnKTsgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBjYW5jZWxQcmVzcygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF9wcmVzc1RpbWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9mZihfbW92ZUV2ZW50cywgY2FuY2VsUHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub2ZmKF9yZWxlYXNlRXZlbnRzLCBjYW5jZWxQcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbmxvbmdwcmVzcyhldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJhZ0VuYWJsZWQpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbGxvd1RyYW5zZm9ybSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnT2Zmc2V0ID0gb2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnT2Zmc2V0ID0ge2xlZnQ6IGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdCwgdG9wOiBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPGFueT5lbGVtZW50KS5jZW50ZXJYID0gZWxlbWVudFswXS5vZmZzZXRXaWR0aCAvIDI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8YW55PmVsZW1lbnQpLmNlbnRlclkgPSBlbGVtZW50WzBdLm9mZnNldEhlaWdodCAvIDI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXggPSBwaXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VYO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXkgPSBwaXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VZO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbXJ4ID0gX214IC0gb2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9tcnkgPSBfbXkgLSBvZmZzZXQudG9wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2NlbnRlckFuY2hvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R4ID0gX214IC0gKDxhbnk+ZWxlbWVudCkuY2VudGVyWCAtICR3aW5kb3cucGFnZVhPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHkgPSBfbXkgLSAoPGFueT5lbGVtZW50KS5jZW50ZXJZIC0gJHdpbmRvdy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eCA9IF9teCAtIF9tcnggLSAkd2luZG93LnBhZ2VYT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R5ID0gX215IC0gX21yeSAtICR3aW5kb3cucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vbihfbW92ZUV2ZW50cywgb25tb3ZlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKF9yZWxlYXNlRXZlbnRzLCBvbnJlbGVhc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGV2ZW50IGlzIHVzZWQgdG8gcmVjZWl2ZSBtYW51YWxseSB0cmlnZ2VyZWQgbW91c2UgbW92ZSBldmVudHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8ganFMaXRlIHVuZm9ydHVuYXRlbHkgb25seSBzdXBwb3J0cyB0cmlnZ2VySGFuZGxlciguLi4pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlZSBodHRwOi8vYXBpLmpxdWVyeS5jb20vdHJpZ2dlckhhbmRsZXIvXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lciA9ICRyb290U2NvcGUuJG9uKCdkcmFnZ2FibGU6X3RyaWdnZXJIYW5kbGVyTW92ZScsIG9ubW92ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lciA9ICRyb290U2NvcGUuJG9uKCdkcmFnZ2FibGU6X3RyaWdnZXJIYW5kbGVyTW92ZScsIGZ1bmN0aW9uIChldmVudCwgb3JpZ0V2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbm1vdmUob3JpZ0V2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbm1vdmUoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2RyYWdFbmFibGVkKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVsZW1lbnQuaGFzQ2xhc3MoJ3BpcC1kcmFnZ2luZycpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZGF0YSA9IGdldERyYWdEYXRhKHNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1kcmFnZ2luZycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdkcmFnZ2FibGU6c3RhcnQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogX214LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IF9teSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eDogX3R4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5OiBfdHksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGV2dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IF9kYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob25EcmFnU3RhcnRDYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N0YXJ0Q2FsbGJhY2soc2NvcGUsIHskZGF0YTogX2RhdGEsICRldmVudDogZXZ0fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9teCA9IHBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9teSA9IHBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaG9yaXpvbnRhbFNjcm9sbCB8fCB2ZXJ0aWNhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ1RvU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfY2VudGVyQW5jaG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHggPSBfbXggLSAoPGFueT5lbGVtZW50KS5jZW50ZXJYIC0gX2RyYWdPZmZzZXQubGVmdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eSA9IF9teSAtICg8YW55PmVsZW1lbnQpLmNlbnRlclkgLSBfZHJhZ09mZnNldC50b3A7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHggPSBfbXggLSBfbXJ4IC0gX2RyYWdPZmZzZXQubGVmdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eSA9IF9teSAtIF9tcnkgLSBfZHJhZ09mZnNldC50b3A7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdmVFbGVtZW50KF90eCwgX3R5KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOm1vdmUnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBfbXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBfbXksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eDogX3R4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHk6IF90eSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBldnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogX2RhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aWQ6IF9teWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ09mZnNldDogX2RyYWdPZmZzZXRcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbnJlbGVhc2UoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2RyYWdFbmFibGVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdkcmFnZ2FibGU6ZW5kJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogX214LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogX215LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHg6IF90eCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5OiBfdHksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IF9kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IG9uRHJhZ0NvbXBsZXRlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdWlkOiBfbXlpZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWRyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucGFyZW50KCkuZmluZCgnLnBpcC1kcmFnLWVudGVyJykucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnLWVudGVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc2V0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vZmYoX21vdmVFdmVudHMsIG9ubW92ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vZmYoX3JlbGVhc2VFdmVudHMsIG9ucmVsZWFzZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob25EcmFnU3RvcENhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ1N0b3BDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBfZGF0YSwgJGV2ZW50OiBldnR9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRHJhZ0NvbXBsZXRlKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9uRHJhZ1N1Y2Nlc3NDYWxsYmFjaylyZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnU3VjY2Vzc0NhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IF9kYXRhLCAkZXZlbnQ6IGV2dH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlc2V0KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWxsb3dUcmFuc2Zvcm0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNzcyh7dHJhbnNmb3JtOiAnJywgJ3otaW5kZXgnOiAnJywgJy13ZWJraXQtdHJhbnNmb3JtJzogJycsICctbXMtdHJhbnNmb3JtJzogJyd9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNzcyh7J3Bvc2l0aW9uJzogX2VsZW1lbnRTdHlsZS5wb3NpdGlvbiwgdG9wOiBfZWxlbWVudFN0eWxlLnRvcCwgbGVmdDogX2VsZW1lbnRTdHlsZS5sZWZ0LCAnei1pbmRleCc6ICcnLCB3aWR0aDogX2VsZW1lbnRTdHlsZS53aWR0aH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBtb3ZlRWxlbWVudCh4LCB5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlV2lkdGggPSBlbGVtZW50LmNzcygnd2lkdGgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFsbG93VHJhbnNmb3JtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiAnbWF0cml4M2QoMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgJyArIHggKyAnLCAnICsgeSArICcsIDAsIDEpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6IDk5OTk5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICctd2Via2l0LXRyYW5zZm9ybSc6ICdtYXRyaXgzZCgxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAnICsgeCArICcsICcgKyB5ICsgJywgMCwgMSknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICctbXMtdHJhbnNmb3JtJzogJ21hdHJpeCgxLCAwLCAwLCAxLCAnICsgeCArICcsICcgKyB5ICsgJyknXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbGVmdCc6IHggKyAncHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0b3AnOiB5ICsgJ3B4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAncG9zaXRpb24nOiAnZml4ZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd6LWluZGV4JzogMTAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBlV2lkdGhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBkcmFnVG9TY3JvbGwoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY3JvbGxYID0gMCwgc2Nyb2xsWSA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50Lm9mZnNldCgpIHx8IHtsZWZ0OiAwLCB0b3A6IDB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChob3Jpem9udGFsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJMZWZ0ID0gb2Zmc2V0KHNjcm9sbENvbnRhaW5lcikubGVmdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJXaWR0aCA9IHNjcm9sbENvbnRhaW5lci5pbm5lcldpZHRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyUmlnaHQgPSBjb250YWluZXJMZWZ0ICsgY29udGFpbmVyV2lkdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChfbXggLSBjb250YWluZXJMZWZ0KSA8IGFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFggPSAtc2Nyb2xsRGlzdGFuY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgoY29udGFpbmVyUmlnaHQgLSBfbXgpIDwgYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWCA9IHNjcm9sbERpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmVydGljYWxTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcCA9IG9mZnNldChzY3JvbGxDb250YWluZXIpLnRvcCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJIZWlnaHQgPSBzY3JvbGxDb250YWluZXIuaW5uZXJIZWlnaHQoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBjb250YWluZXJUb3AgKyBjb250YWluZXJIZWlnaHQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChfbXkgLSBjb250YWluZXJUb3ApIDwgYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWSA9IC1zY3JvbGxEaXN0YW5jZSArIDMwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKGNvbnRhaW5lckJvdHRvbSAtIF9teSkgPCBhY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxZID0gc2Nyb2xsRGlzdGFuY2UgLSAzMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsWCAhPT0gMCB8fCBzY3JvbGxZICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJTY3JvbGxMZWZ0ID0gc2Nyb2xsQ29udGFpbmVyLnNjcm9sbExlZnQoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJTY3JvbGxUb3AgPSBzY3JvbGxDb250YWluZXIuc2Nyb2xsVG9wKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyLnNjcm9sbExlZnQoY29udGFpbmVyU2Nyb2xsTGVmdCArIHNjcm9sbFgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcChjb250YWluZXJTY3JvbGxUb3AgKyBzY3JvbGxZKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwRHJvcCcsIFxyXG4gICAgICAgIGZ1bmN0aW9uICgkcGFyc2UsICR0aW1lb3V0LCAkd2luZG93LCAkZG9jdW1lbnQsIHBpcERyYWdnYWJsZSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZTogYW55LCBlbGVtZW50LCBhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS52YWx1ZSA9IGF0dHJzLnBpcERyb3A7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5pc1RvdWNoaW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIF9sYXN0RHJvcFRvdWNoID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHZhciBfbXlpZCA9IHNjb3BlLiRpZDtcclxuICAgICAgICAgICAgICAgIHZhciBfZHJvcEVuYWJsZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgb25Ecm9wQ2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJvcFN1Y2Nlc3MpOy8vIHx8IGZ1bmN0aW9uKCl7fTtcclxuICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdGFydENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdGFydCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3RvcENhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdG9wKTtcclxuICAgICAgICAgICAgICAgIHZhciBvbkRyYWdNb3ZlQ2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ01vdmUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICAgICAgICAgICAgICB0b2dnbGVMaXN0ZW5lcnModHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdG9nZ2xlTGlzdGVuZXJzKGVuYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lcnNcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWVuYWJsZSlyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGxpc3RlbmVycy5cclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goYXR0cnMucGlwRHJvcCwgb25FbmFibGVDaGFuZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBvbkRlc3Ryb3kpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRvbignZHJhZ2dhYmxlOnN0YXJ0Jywgb25EcmFnU3RhcnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRvbignZHJhZ2dhYmxlOm1vdmUnLCBvbkRyYWdNb3ZlKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS4kb24oJ2RyYWdnYWJsZTplbmQnLCBvbkRyYWdFbmQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRGVzdHJveShlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0b2dnbGVMaXN0ZW5lcnMoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRW5hYmxlQ2hhbmdlKG5ld1ZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2Ryb3BFbmFibGVkID0gbmV3VmFsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRHJhZ1N0YXJ0KGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJvcEVuYWJsZWQpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGlzVG91Y2hpbmcob2JqLngsIG9iai55LCBvYmouZWxlbWVudCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5waXBEcmFnU3RhcnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnU3RhcnRDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBvYmouZGF0YSwgJGV2ZW50OiBvYmp9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRHJhZ01vdmUoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcm9wRW5hYmxlZClyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLnBpcERyYWdNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJhZ01vdmVDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBvYmouZGF0YSwgJGV2ZW50OiBvYmp9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRHJhZ0VuZChldnQsIG9iaikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGRvbid0IGxpc3RlbiB0byBkcm9wIGV2ZW50cyBpZiB0aGlzIGlzIHRoZSBlbGVtZW50IGJlaW5nIGRyYWdnZWRcclxuICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IHVwZGF0ZSB0aGUgc3R5bGVzIGFuZCByZXR1cm5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcm9wRW5hYmxlZCB8fCBfbXlpZCA9PT0gb2JqLnVpZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVEcmFnU3R5bGVzKGZhbHNlLCBvYmouZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbGwgdGhlIHBpcERyYWdnYWJsZSBwaXBEcmFnU3VjY2VzcyBlbGVtZW50IGNhbGxiYWNrXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvYmouY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iai5jYWxsYmFjayhvYmopO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMucGlwRHJvcFN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyb3BDYWxsYmFjayhzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZGF0YTogb2JqLmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDogb2JqLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGFyZ2V0OiBzY29wZS4kZXZhbChzY29wZS52YWx1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMucGlwRHJhZ1N0b3ApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnU3RvcENhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IG9iai5kYXRhLCAkZXZlbnQ6IG9ian0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZURyYWdTdHlsZXMoZmFsc2UsIG9iai5lbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpc1RvdWNoaW5nKG1vdXNlWCwgbW91c2VZLCBkcmFnRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0b3VjaGluZyA9IGhpdFRlc3QobW91c2VYLCBtb3VzZVkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmlzVG91Y2hpbmcgPSB0b3VjaGluZztcclxuICAgICAgICAgICAgICAgICAgICBpZiAodG91Y2hpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2xhc3REcm9wVG91Y2ggPSBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVEcmFnU3R5bGVzKHRvdWNoaW5nLCBkcmFnRWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRvdWNoaW5nO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZURyYWdTdHlsZXModG91Y2hpbmcsIGRyYWdFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvdWNoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1kcmFnLWVudGVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdFbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZy1vdmVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfbGFzdERyb3BUb3VjaCA9PSBlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9sYXN0RHJvcFRvdWNoID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWRyYWctZW50ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0VsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnLW92ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhpdFRlc3QoeCwgeSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBib3VuZHMgPSBlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHggLT0gJGRvY3VtZW50WzBdLmJvZHkuc2Nyb2xsTGVmdCArICRkb2N1bWVudFswXS5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdDtcclxuICAgICAgICAgICAgICAgICAgICB5IC09ICRkb2N1bWVudFswXS5ib2R5LnNjcm9sbFRvcCArICRkb2N1bWVudFswXS5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4ID49IGJvdW5kcy5sZWZ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIHggPD0gYm91bmRzLnJpZ2h0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIHkgPD0gYm91bmRzLmJvdHRvbVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiB5ID49IGJvdW5kcy50b3A7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy90aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwRHJhZ0Nsb25lJywgZnVuY3Rpb24gKCRwYXJzZSwgJHRpbWVvdXQsIHBpcERyYWdnYWJsZSkge1xyXG4gICAgLy8gICAgcmV0dXJuIHtcclxuICAgIC8vICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgLy8gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgIC8vICAgICAgICAgICAgdmFyIGltZywgX2FsbG93Q2xvbmUgPSB0cnVlO1xyXG4gICAgLy8gICAgICAgICAgICB2YXIgX2RyYWdPZmZzZXQgPSBudWxsO1xyXG4gICAgLy8gICAgICAgICAgICBzY29wZS5jbG9uZWREYXRhID0ge307XHJcbiAgICAvLyAgICAgICAgICAgIGluaXRpYWxpemUoKTtcclxuICAgIC8vICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuLy9cclxuICAgIC8vICAgICAgICAgICAgICAgIGltZyA9IGVsZW1lbnQuZmluZCgnaW1nJyk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoJ3BpcC1kcmFnZ2FibGUnLCAnZmFsc2UnKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGltZy5hdHRyKCdkcmFnZ2FibGUnLCAnZmFsc2UnKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIHJlc2V0KCk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICB0b2dnbGVMaXN0ZW5lcnModHJ1ZSk7XHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuLy9cclxuLy9cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gdG9nZ2xlTGlzdGVuZXJzKGVuYWJsZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICAgICAgaWYgKCFlbmFibGUpcmV0dXJuO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgLy8gYWRkIGxpc3RlbmVycy5cclxuICAgIC8vICAgICAgICAgICAgICAgIHNjb3BlLiRvbignZHJhZ2dhYmxlOnN0YXJ0Jywgb25EcmFnU3RhcnQpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6bW92ZScsIG9uRHJhZ01vdmUpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6ZW5kJywgb25EcmFnRW5kKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIHByZXZlbnRDb250ZXh0TWVudSgpO1xyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICB9XHJcblxyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiBwcmV2ZW50Q29udGV4dE1lbnUoKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAvLyAgZWxlbWVudC5vZmYoJ21vdXNlZG93biB0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIGFic29yYkV2ZW50Xyk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBpbWcub2ZmKCdtb3VzZWRvd24gdG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLCBhYnNvcmJFdmVudF8pO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgLy8gIGVsZW1lbnQub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIGFic29yYkV2ZW50Xyk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBpbWcub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIGFic29yYkV2ZW50Xyk7XHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIG9uRHJhZ1N0YXJ0KGV2dCwgb2JqLCBlbG0pIHtcclxuICAgIC8vICAgICAgICAgICAgICAgIF9hbGxvd0Nsb25lID0gdHJ1ZTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChvYmouZGF0YS5hbGxvd0Nsb25lKSkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIF9hbGxvd0Nsb25lID0gb2JqLmRhdGEuYWxsb3dDbG9uZTtcclxuICAgIC8vICAgICAgICAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgICAgICAgIGlmIChfYWxsb3dDbG9uZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmNsb25lZERhdGEgPSBvYmouZGF0YTtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNzcygnd2lkdGgnLCBvYmouZWxlbWVudFswXS5vZmZzZXRXaWR0aCk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3MoJ2hlaWdodCcsIG9iai5lbGVtZW50WzBdLm9mZnNldEhlaWdodCk7XHJcbi8vXHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgbW92ZUVsZW1lbnQob2JqLnR4LCBvYmoudHkpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgfVxyXG4vL1xyXG4gICAgLy8gICAgICAgICAgICB9XHJcblxyXG4gICAgLy8gICAgICAgICAgICBmdW5jdGlvbiBvbkRyYWdNb3ZlKGV2dCwgb2JqKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBpZiAoX2FsbG93Q2xvbmUpIHtcclxuLy9cclxuICAgIC8vICAgICAgICAgICAgICAgICAgICBfdHggPSBvYmoudHggKyBvYmouZHJhZ09mZnNldC5sZWZ0O1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIF90eSA9IG9iai50eSArIG9iai5kcmFnT2Zmc2V0LnRvcDtcclxuLy9cclxuICAgIC8vICAgICAgICAgICAgICAgICAgICBtb3ZlRWxlbWVudChfdHgsIF90eSk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICB9XHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuXHJcbiAgICAvLyAgICAgICAgICAgIGZ1bmN0aW9uIG9uRHJhZ0VuZChldnQsIG9iaikge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgLy9tb3ZlRWxlbWVudChvYmoudHgsb2JqLnR5KTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGlmIChfYWxsb3dDbG9uZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIHJlc2V0KCk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICB9XHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuLy9cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gcmVzZXQoKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBlbGVtZW50LmNzcyh7bGVmdDogMCwgdG9wOiAwLCBwb3NpdGlvbjogJ2ZpeGVkJywgJ3otaW5kZXgnOiAtMSwgdmlzaWJpbGl0eTogJ2hpZGRlbid9KTtcclxuICAgIC8vICAgICAgICAgICAgfVxyXG5cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gbW92ZUVsZW1lbnQoeCwgeSkge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiA5OTk5OSxcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICAndmlzaWJpbGl0eSc6ICd2aXNpYmxlJyxcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnbWF0cml4M2QoMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgJyArIHggKyAnLCAnICsgeSArICcsIDAsIDEpJyxcclxuICAgIC8vICAgICAgICAgICAgICAgICAgICAnLW1zLXRyYW5zZm9ybSc6ICdtYXRyaXgoMSwgMCwgMCwgMSwgJyArIHggKyAnLCAnICsgeSArICcpJ1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIC8vLG1hcmdpbjogJzAnICBkb24ndCBtb25rZXkgd2l0aCB0aGUgbWFyZ2luLFxyXG4gICAgLy8gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuLy9cclxuICAgIC8vICAgICAgICAgICAgZnVuY3Rpb24gYWJzb3JiRXZlbnRfKGV2ZW50KSB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICB2YXIgZSA9IGV2ZW50Oy8vLm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0ICYmIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgIC8vICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uICYmIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XHJcbiAgICAvLyAgICAgICAgICAgICAgICBlLnJldHVyblZhbHVlID0gZmFsc2U7XHJcbiAgICAvLyAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAvLyAgICAgICAgICAgIH1cclxuLy9cclxuICAgIC8vICAgICAgICB9XHJcbiAgICAvLyAgICB9O1xyXG4gICAgLy99KTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwUHJldmVudERyYWcnLCBmdW5jdGlvbiAoJHBhcnNlLCAkdGltZW91dCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZTogYW55LCBlbGVtZW50LCBhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cigncGlwLWRyYWdnYWJsZScsICdmYWxzZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZW5hYmxlKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIGFic29yYkV2ZW50Xyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gYWJzb3JiRXZlbnRfKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGUgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQgJiYgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uICYmIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcENhbmNlbERyYWcnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5maW5kKCcqJykuYXR0cigncGlwLWNhbmNlbC1kcmFnJywgJ3BpcC1jYW5jZWwtZHJhZycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG59KSgpO1xyXG5cclxuIiwiLyoqXHJcbiAqIEBmaWxlIEtleWJvYXJkIG5hdmlnYXRpb24gb3ZlciBmZXcgZm9jdXNhYmxlIGNvbnRyb2xzXHJcbiAqIEBjb3B5cmlnaHQgRGlnaXRhbCBMaXZpbmcgU29mdHdhcmUgQ29ycC4gMjAxNC0yMDE2XHJcbiAqL1xyXG5cclxuLyogZ2xvYmFsIGFuZ3VsYXIgKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIHRoaXNNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShcInBpcEZvY3VzZWRcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBGb2N1c2VkJywgZnVuY3Rpb24gKCR0aW1lb3V0LCAkbWRDb25zdGFudCwgJHdpbmRvdykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlcXVpcmU6IFwiP25nTW9kZWxcIixcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZTogYW55LCAkZWxlbWVudCwgJGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBjb250cm9scywgY29udHJvbHNMZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgd2l0aEhpZGRlbiA9ICRhdHRycy5waXBXaXRoSGlkZGVuLFxyXG4gICAgICAgICAgICAgICAgICAgIG9wYWNpdHlEZWx0YSA9IDAuNCxcclxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5TGltaXQgPSAwLjUsXHJcbiAgICAgICAgICAgICAgICAgICAgX2NvbG9yLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvY3VzZWRDb2xvciA9ICRhdHRycy5waXBGb2N1c2VkQ29sb3IgPyAkYXR0cnMucGlwRm9jdXNlZENvbG9yIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICByZUluaXQgPSAkYXR0cnMucGlwRm9jdXNlZFJlYmluZCA/ICRhdHRycy5waXBGb2N1c2VkUmViaW5kIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBmb2N1c2VkVGFiaW5kZXggPSAkYXR0cnMucGlwRm9jdXNlZFRhYmluZGV4ID8gcGFyc2VJbnQoJGF0dHJzLnBpcEZvY3VzZWRUYWJpbmRleCkgfHwgMCA6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNPcGFjaXR5ID0gJGF0dHJzLnBpcEZvY3VzZWRPcGFjaXR5ID8gdG9Cb29sZWFuKCRhdHRycy5waXBGb2N1c2VkT3BhY2l0eSkgOiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAkdGltZW91dChpbml0KTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdrZXlkb3duJywga2V5ZG93bkxpc3RlbmVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoJGF0dHJzLm5nTW9kZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCRhdHRycy5uZ01vZGVsLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGluaXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIENvbnZlcnRzIHZhbHVlIGludG8gYm9vbGVhblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdG9Cb29sZWFuKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09ICcxJyB8fCB2YWx1ZSA9PSAndHJ1ZSc7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJnYmEoY29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZm9jdXNlZENvbG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmb2N1c2VkQ29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXJyID0gY29sb3Iuc3BsaXQoXCIoXCIpWzFdLnNwbGl0KFwiKVwiKVswXS5zcGxpdChcIixcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghYXJyIHx8IGFyci5sZW5ndGggPCAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlZCwgYmx1ZSwgZ3JlZW4sIG9wYWNpdHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIG9wYWNpdHkgPSBhcnIubGVuZ3RoID09IDMgPyAxIDogcGFyc2VGbG9hdChhcnJbM10pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlZCA9IGFyclswXTtcclxuICAgICAgICAgICAgICAgICAgICBibHVlID0gYXJyWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIGdyZWVuID0gYXJyWzJdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BhY2l0eSA8IG9wYWNpdHlMaW1pdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5ICs9IG9wYWNpdHlEZWx0YTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5IC09IG9wYWNpdHlEZWx0YTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAncmdiYSgnICsgcmVkICsgJywgJyArIGJsdWUgKyAnLCAnICsgZ3JlZW4gKyAnLCAnICsgb3BhY2l0eSArICcpJztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzZXRUYWJpbmRleChlbGVtZW50LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tUYWJpbmRleChjb250cm9scykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmRleCA9IF8uZmluZEluZGV4KGNvbnRyb2xzLCAoYykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY1sndGFiaW5kZXgnXSA+IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT0gLTEgJiYgY29udHJvbHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgZWwgPSBjb250cm9sc1swXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGFiaW5kZXgoYW5ndWxhci5lbGVtZW50KGNvbnRyb2xzWzBdKSwgZm9jdXNlZFRhYmluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSB3aXRoSGlkZGVuID8gJy5waXAtZm9jdXNhYmxlJyA6ICcucGlwLWZvY3VzYWJsZTp2aXNpYmxlJztcclxuICAgICAgICAgICAgICAgICAgICBjb250cm9scyA9ICRlbGVtZW50LmZpbmQoc2VsZWN0b3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzTGVuZ3RoID0gY29udHJvbHMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrVGFiaW5kZXgoY29udHJvbHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBuZWVkZWQgZXZlbnQgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbHMub24oJ2ZvY3VzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5oYXNDbGFzcygnbWQtZm9jdXNlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlSW5pdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzT3BhY2l0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVsbCA9IGFuZ3VsYXIuZWxlbWVudCgkKHRoaXMpWzBdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY29sb3IgPSAkKHRoaXMpLmNzcygnYmFja2dyb3VuZENvbG9yJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBfY29sb3IgPSAkd2luZG93LmdldENvbXB1dGVkU3R5bGUoJCh0aGlzKVswXSwgbnVsbCkuYmFja2dyb3VuZENvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIHJnYmEoX2NvbG9yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdtZC1mb2N1c2VkIG1kLWZvY3VzZWQtb3BhY2l0eScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZXRUYWJpbmRleChhbmd1bGFyLmVsZW1lbnQoJCh0aGlzKVswXSksIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pLm9uKCdmb2N1c291dCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEkKHRoaXMpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWZvY3VzZWQtY29udGFpbmVyJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNPcGFjaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAkKHRoaXMpLmNzcygnYmFja2dyb3VuZENvbG9yJywgX2NvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCBcIlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQgbWQtZm9jdXNlZC1vcGFjaXR5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgSSBnbyBmcm9tIGJsb2NrIGFsbCBlbGVtZW50IGhhdmUgdGFiaW5kZXggPSAtMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZXRUYWJpbmRleChhbmd1bGFyLmVsZW1lbnQoJCh0aGlzKVswXSksIC0xKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBrZXlkb3duTGlzdGVuZXIoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlDb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgY29udHJvbCBrZXlDb2RlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuTEVGVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluY3JlbWVudCA9IChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykgPyAxIDogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb3ZlVG9Db250cm9sID0gY29udHJvbHMuaW5kZXgoY29udHJvbHMuZmlsdGVyKFwiLm1kLWZvY3VzZWRcIikpICsgaW5jcmVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNb3ZlIGZvY3VzIHRvIG5leHQgY29udHJvbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobW92ZVRvQ29udHJvbCA+PSAwICYmIG1vdmVUb0NvbnRyb2wgPCBjb250cm9sc0xlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbHNbbW92ZVRvQ29udHJvbF0uZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbn0pKCk7XHJcblxyXG4iLCIvKipcclxuICogQGZpbGUgSW5maW5pdGUgc2Nyb2xsaW5nIGJlaGF2aW9yXHJcbiAqIEBkZXNjcmlwdGlvblxyXG4gKiBNb2RpZmllZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9zcm96ZS9uZ0luZmluaXRlU2Nyb2xsXHJcbiAqIEBjb3B5cmlnaHQgRGlnaXRhbCBMaXZpbmcgU29mdHdhcmUgQ29ycC4gMjAxNC0yMDE2XHJcbiAqL1xyXG5cclxuLyogZ2xvYmFsIGFuZ3VsYXIgKi9cclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIHRoaXNNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShcInBpcEluZmluaXRlU2Nyb2xsXCIsIFtdKTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwSW5maW5pdGVTY3JvbGwnLCBcclxuICAgICAgICBmdW5jdGlvbigkcm9vdFNjb3BlLCAkd2luZG93LCAkaW50ZXJ2YWwsICRwYXJzZSkge1xyXG4gICAgICAgICAgICB2YXIgVEhST1RUTEVfTUlMTElTRUNPTkRTID0gNTAwO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGlwSW5maW5pdGVTY3JvbGw6ICcmJyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxDb250YWluZXI6ICc9JyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxEaXN0YW5jZTogJz0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbERpc2FibGVkOiAnPScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b206ICc9JyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxMaXN0ZW5Gb3JFdmVudDogJ0AnXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlOiBhbnksICRlbGVtZW50LCAkYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tXaGVuRW5hYmxlZCA9IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1tZWRpYXRlQ2hlY2sgPSB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxEaXN0YW5jZSA9IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbEVuYWJsZWQgPSBudWxsLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VEb2N1bWVudEJvdHRvbSA9IGZhbHNlLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93RWxlbWVudCA9IGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoZWlnaHQoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXSB8fCBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYU4oZWxlbWVudC5vZmZzZXRIZWlnaHQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb2Zmc2V0VG9wKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCB8fCBlbGVtZW50LmNzcygnbm9uZScpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICsgcGFnZVlPZmZzZXQoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcGFnZVlPZmZzZXQoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXSB8fCBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYU4od2luZG93LnBhZ2VZT2Zmc2V0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50Lm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25Db250YWluZXJTY3JvbGwgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbWFpbmluZywgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRTY3JvbGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsQ29udGFpbmVyID09PSB3aW5kb3dFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBoZWlnaHQoc2Nyb2xsQ29udGFpbmVyKSArIHBhZ2VZT2Zmc2V0KHNjcm9sbENvbnRhaW5lclswXS5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSA9IG9mZnNldFRvcCgkZWxlbWVudCkgKyBoZWlnaHQoJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gaGVpZ2h0KHNjcm9sbENvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9mZnNldFRvcChzY3JvbGxDb250YWluZXIpICE9PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQgPSBvZmZzZXRUb3Aoc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSBvZmZzZXRUb3AoJGVsZW1lbnQpIC0gY29udGFpbmVyVG9wT2Zmc2V0ICsgaGVpZ2h0KCRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVzZURvY3VtZW50Qm90dG9tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gaGVpZ2h0KCgkZWxlbWVudFswXS5vd25lckRvY3VtZW50IHx8ICg8YW55PiRlbGVtZW50WzBdKS5kb2N1bWVudCkuZG9jdW1lbnRFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtYWluaW5nID0gZWxlbWVudEJvdHRvbSAtIGNvbnRhaW5lckJvdHRvbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdWxkU2Nyb2xsID0gcmVtYWluaW5nIDw9IGhlaWdodChzY3JvbGxDb250YWluZXIpICogc2Nyb2xsRGlzdGFuY2UgKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNob3VsZFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tXaGVuRW5hYmxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuJCRwaGFzZSB8fCAkcm9vdFNjb3BlLiQkcGhhc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5waXBJbmZpbml0ZVNjcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuJGFwcGx5KCRzY29wZS5waXBJbmZpbml0ZVNjcm9sbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoZWNrV2hlbkVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChUSFJPVFRMRV9NSUxMSVNFQ09ORFMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNvbnRhaW5lclNjcm9sbCA9IF8udGhyb3R0bGUob25Db250YWluZXJTY3JvbGwsIFRIUk9UVExFX01JTExJU0VDT05EUyk7ICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci51bmJpbmQoJ3Njcm9sbCcsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVucmVnaXN0ZXJFdmVudExpc3RlbmVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucmVnaXN0ZXJFdmVudExpc3RlbmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbERpc3RhbmNlKHYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjcm9sbERpc3RhbmNlID0gcGFyc2VGbG9hdCh2KSB8fCAwO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsRGlzdGFuY2UnLCBoYW5kbGVTY3JvbGxEaXN0YW5jZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsRGlzdGFuY2UoJHNjb3BlLnBpcFNjcm9sbERpc3RhbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVTY3JvbGxEaXNhYmxlZCh2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbEVuYWJsZWQgPSAhdjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbEVuYWJsZWQgJiYgY2hlY2tXaGVuRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tXaGVuRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9uQ29udGFpbmVyU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbERpc2FibGVkJywgaGFuZGxlU2Nyb2xsRGlzYWJsZWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZVNjcm9sbERpc2FibGVkKCRzY29wZS5waXBTY3JvbGxEaXNhYmxlZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKHYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZURvY3VtZW50Qm90dG9tID0gdjtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tJywgaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20pO1xyXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKCRzY29wZS5waXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoYW5nZUNvbnRhaW5lcihuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbENvbnRhaW5lciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIudW5iaW5kKCdzY3JvbGwnLCBvbkNvbnRhaW5lclNjcm9sbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IG5ld0NvbnRhaW5lcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2Nyb2xsQ29udGFpbmVyLmJpbmQoJ3Njcm9sbCcsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZUNvbnRhaW5lcih3aW5kb3dFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnBpcFNjcm9sbExpc3RlbkZvckV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVucmVnaXN0ZXJFdmVudExpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJHNjb3BlLnBpcFNjcm9sbExpc3RlbkZvckV2ZW50LCBvbkNvbnRhaW5lclNjcm9sbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVTY3JvbGxDb250YWluZXIobmV3Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgobmV3Q29udGFpbmVyID09IG51bGwpIHx8IG5ld0NvbnRhaW5lci5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChuZXdDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBuZXdDb250YWluZXIuYXBwZW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQobmV3Q29udGFpbmVyW25ld0NvbnRhaW5lci5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld0NvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9ICRlbGVtZW50LnBhcmVudHMoKS5maW5kKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIgIT0gbnVsbCAmJiAoIUFycmF5LmlzQXJyYXkobmV3Q29udGFpbmVyKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKEFycmF5LmlzQXJyYXkobmV3Q29udGFpbmVyKSAmJiBuZXdDb250YWluZXIubGVuZ3RoID4gMCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hhbmdlQ29udGFpbmVyKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHBpcC1zY3JvbGwtY29udGFpbmVyIGF0dHJpYnV0ZS5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbENvbnRhaW5lcicsIGZ1bmN0aW9uIChuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPT0gc2Nyb2xsQ29udGFpbmVyKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsQ29udGFpbmVyKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsQ29udGFpbmVyKCRzY29wZS5waXBTY3JvbGxDb250YWluZXIgfHwgW10pO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkYXR0cnMucGlwU2Nyb2xsUGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ29udGFpbmVyKGFuZ3VsYXIuZWxlbWVudCgkZWxlbWVudC5wYXJlbnQoKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoJGF0dHJzLnBpcFNjcm9sSW1tZWRpYXRlQ2hlY2sgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbW1lZGlhdGVDaGVjayA9ICRzY29wZS4kZXZhbCgkYXR0cnMucGlwU2Nyb2xJbW1lZGlhdGVDaGVjayk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkaW50ZXJ2YWwoKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1tZWRpYXRlQ2hlY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvbkNvbnRhaW5lclNjcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSksIDAsIDEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxuXHJcbn0pKCk7XHJcblxyXG4iLCIvKipcclxuICogQGZpbGUgS2V5Ym9hcmQgbmF2aWdhdGlvbiB3aXRoIHNjcm9sbGluZyBvdmVyIG5vbi1mb2N1c2FibGUgY29udHJvbHNcclxuICogQGNvcHlyaWdodCBEaWdpdGFsIExpdmluZyBTb2Z0d2FyZSBDb3JwLiAyMDE0LTIwMTZcclxuICovXHJcblxyXG4vKiBnbG9iYWwgYW5ndWxhciAqL1xyXG5cclxuKGZ1bmN0aW9uICgpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwU2VsZWN0ZWRcIiwgW10pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBTZWxlY3RlZCcsZnVuY3Rpb24gKCRwYXJzZSwgJG1kQ29uc3RhbnQsICR0aW1lb3V0KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoJHNjb3BlOiBhbnksICRlbGVtZW50LCAkYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgaW5kZXhHZXR0ZXIgPSAkYXR0cnMucGlwU2VsZWN0ZWQgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdGVkKSA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5kZXhTZXR0ZXIgPSBpbmRleEdldHRlciA/IGluZGV4R2V0dGVyLmFzc2lnbiA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaWRHZXR0ZXIgPSAkYXR0cnMucGlwU2VsZWN0ZWRJZCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0ZWRJZCkgOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkU2V0dGVyID0gaWRHZXR0ZXIgPyBpZEdldHRlci5hc3NpZ24gOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZUdldHRlciA9ICRhdHRycy5waXBTZWxlY3QgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdCkgOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGVudGVyU3BhY2VHZXR0ZXIgPSAkYXR0cnMucGlwRW50ZXJTcGFjZVByZXNzID8gJHBhcnNlKCRhdHRycy5waXBFbnRlclNwYWNlUHJlc3MpIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBub1Njcm9sbCA9IHRvQm9vbGVhbigkYXR0cnMucGlwTm9TY3JvbGwpLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vZGlmaWVyID0gdG9Cb29sZWFuKCRhdHRycy5waXBTa2lwSGlkZGVuKSA/ICc6dmlzaWJsZScgOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWUgPSB0b0Jvb2xlYW4oJGF0dHJzLnBpcFRyZWVMaXN0KSA/ICcucGlwLXNlbGVjdGFibGUtdHJlZScgOiAnLnBpcC1zZWxlY3RhYmxlJyxcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gaW5kZXhHZXR0ZXIoJHNjb3BlKSxcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50RWxlbWVudFRhYmluZXggPSAkZWxlbWVudC5hdHRyKCd0YWJpbmRleCcpLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNlbGVjdGVkV2F0Y2ggPSAkYXR0cnMucGlwU2VsZWN0ZWRXYXRjaCxcclxuICAgICAgICAgICAgICAgICAgICBpc1Njcm9sbGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRhYmluZGV4IGlmIGl0J3Mgbm90IHNldCB5ZXRcclxuICAgICAgICAgICAgICAgICRlbGVtZW50LmF0dHIoJ3RhYmluZGV4JywgY3VycmVudEVsZW1lbnRUYWJpbmV4IHx8IDApO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFdhdGNoIHNlbGVjdGVkIGl0ZW0gaW5kZXhcclxuICAgICAgICAgICAgICAgIGlmICghdG9Cb29sZWFuKCRhdHRycy5waXBUcmVlTGlzdCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGluZGV4R2V0dGVyLCBmdW5jdGlvbihuZXdTZWxlY3RlZEluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oe2l0ZW1JbmRleDogbmV3U2VsZWN0ZWRJbmRleH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKGlkR2V0dGVyLCBmdW5jdGlvbihuZXdTZWxlY3RlZElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbUlkOiBuZXdTZWxlY3RlZElkLCByYWlzZUV2ZW50OiB0cnVlfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFdhdGNoIHJlc3luYyBzZWxlY3Rpb25cclxuICAgICAgICAgICAgICAgIGlmIChwaXBTZWxlY3RlZFdhdGNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChwaXBTZWxlY3RlZFdhdGNoLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRGVsYXkgdXBkYXRlIHRvIGFsbG93IG5nLXJlcGVhdCB0byB1cGRhdGUgRE9NXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gaW5kZXhHZXR0ZXIoJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oe2l0ZW1JbmRleDogc2VsZWN0ZWRJbmRleH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFNlbGVjdCBpdGVtIGRlZmluZWQgYnkgaW5kZXhcclxuICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oe2l0ZW1JbmRleDogc2VsZWN0ZWRJbmRleCwgaXRlbXM6ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lKX0pO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIENvbnZlcnRzIHZhbHVlIGludG8gYm9vbGVhblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdG9Cb29sZWFuKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09ICcxJyB8fCB2YWx1ZSA9PSAndHJ1ZSc7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBGdW5jdGlvbnMgYW5kIGxpc3RlbmVyc1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNlbGVjdEl0ZW0oaXRlbVBhcmFtcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Njcm9sbGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW1JbmRleCA9IGl0ZW1QYXJhbXMuaXRlbUluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtSWQgPSBpdGVtUGFyYW1zLml0ZW1JZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSBpdGVtUGFyYW1zLml0ZW1zIHx8ICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lICsgbW9kaWZpZXIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtc0xlbmd0aCA9IGl0ZW1zLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbVBhcmFtcy5pdGVtKSByZXR1cm4gaXRlbVBhcmFtcy5pdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA9PT0gdW5kZWZpbmVkICYmIGl0ZW1JbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXggPSBpdGVtcy5pbmRleChpdGVtcy5maWx0ZXIoJ1twaXAtaWQ9JyArIGl0ZW1JZCArICddJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA+PSAwICYmIGl0ZW1JbmRleCA8IGl0ZW1zTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW1zW2l0ZW1JbmRleF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSgpKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmFpc2VFdmVudCA9IGl0ZW1QYXJhbXMucmFpc2VFdmVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuZmluZChjbGFzc05hbWUpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCBtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSBhbmd1bGFyLmVsZW1lbnQoaXRlbSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2VsZWN0ZWQgbWQtZm9jdXNlZCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZm9jdXMoKTsgLy8gdG9kbyDRgdC00LLQuNCz0LDQtdGCINGB0L/QuNGB0L7QuiDRgtGD0YIsINC90LAg0L/QtdGA0LLQvtC8INC/0YDQvtGF0L7QtNC1XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbm9TY3JvbGwpIHNjcm9sbFRvSXRlbShpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJhaXNlRXZlbnQpIGRlZmluZVNlbGVjdGVkSW5kZXgoaXRlbXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gZGVmaW5lU2VsZWN0ZWRJbmRleChpdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGRTZWxlY3RlZEluZGV4ID0gc2VsZWN0ZWRJbmRleDtcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGl0ZW1zLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJChpdGVtc1tpbmRleF0pLmhhc0NsYXNzKCdzZWxlY3RlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gaW5kZXg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEV4ZWN1dGUgY2FsbGJhY2sgdG8gbm90aWZ5IGFib3V0IGl0ZW0gc2VsZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9sZFNlbGVjdGVkSW5kZXggIT0gc2VsZWN0ZWRJbmRleCAmJiBzZWxlY3RlZEluZGV4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KHVwZGF0ZUluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KG9uU2VsZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZUluZGV4KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWRJdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW1zW3NlbGVjdGVkSW5kZXhdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBzZWxlY3RlZEl0ZW0uYXR0cigncGlwLWlkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhTZXR0ZXIpIGluZGV4U2V0dGVyKCRzY29wZSwgc2VsZWN0ZWRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZFNldHRlcikgaWRTZXR0ZXIoJHNjb3BlLCBzZWxlY3RlZElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25TZWxlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvblNlbGVjdCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkSXRlbSA9IGFuZ3VsYXIuZWxlbWVudChpdGVtc1tzZWxlY3RlZEluZGV4XSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZElkID0gc2VsZWN0ZWRJdGVtLmF0dHIoJ3BpcC1pZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoYW5nZUdldHRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlR2V0dGVyKCRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6ICRlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtOiBzZWxlY3RlZEl0ZW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiBzZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZWN0ZWRJZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SW5kZXg6IHNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9sZEluZGV4OiBvbGRTZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNjcm9sbFRvSXRlbSgkaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub1Njcm9sbCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyVG9wID0gJGVsZW1lbnQub2Zmc2V0KCkudG9wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJIZWlnaHQgPSAkZWxlbWVudC5oZWlnaHQoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gY29udGFpbmVyVG9wICsgY29udGFpbmVySGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtVG9wID0gJGl0ZW0ub2Zmc2V0KCkudG9wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtSGVpZ2h0ID0gJGl0ZW0ub3V0ZXJIZWlnaHQodHJ1ZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1Cb3R0b20gPSBpdGVtVG9wICsgaXRlbUhlaWdodCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsVG9wID0gJGVsZW1lbnQuc2Nyb2xsVG9wKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1Njcm9sbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc1Njcm9sbGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250YWluZXJUb3AgPiBpdGVtVG9wKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LnNjcm9sbFRvcChjb250YWluZXJTY3JvbGxUb3AgKyBpdGVtVG9wIC0gY29udGFpbmVyVG9wKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY29udGFpbmVyQm90dG9tIDwgaXRlbUJvdHRvbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgaXRlbUJvdHRvbSAtIGNvbnRhaW5lckJvdHRvbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2NsaWNrIHRvdWNoc3RhcnQnLCBjbGFzc05hbWUsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oe2l0ZW06IGV2ZW50LmN1cnJlbnRUYXJnZXQsIHJhaXNlRXZlbnQ6IHRydWV9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdrZXlkb3duJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5Q29kZSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBjb250cm9sIGtleUNvZGVcclxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5FTlRFUiB8fCBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlNQQUNFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRlclNwYWNlR2V0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRlclNwYWNlR2V0dGVyKCRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6ICRlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogc2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTogJGVsZW1lbnQuZmluZCgnLnNlbGVjdGVkJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5MRUZUX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5VUF9BUlJPVyB8fCBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1cpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCBuZXh0IHNlbGVjdGFibGUgY29udHJvbCBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbXMgPSAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArIG1vZGlmaWVyKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluYyA9IChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykgPyAxIDogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdTZWxlY3RlZEluZGV4ID0gc2VsZWN0ZWRJbmRleCArIGluYztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBuZXh0IGNvbnRyb2wgYXMgc2VsZWN0ZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbUluZGV4OiBuZXdTZWxlY3RlZEluZGV4LCBpdGVtczogaXRlbXMsIHJhaXNlRXZlbnQ6IHRydWV9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5vbignZm9jdXNpbicsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIENob29zZSBzZWxlY3RlZCBlbGVtZW50XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW1zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArICcuc2VsZWN0ZWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIGFyZSBub3Qgc2VsZWN0ZWQgZWxlbWVudHMgdGhlbiBwaWNrIHRoZSBmaXJzdCBvbmVcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gaW5kZXhHZXR0ZXIoJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArIG1vZGlmaWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7aXRlbUluZGV4OiBzZWxlY3RlZEluZGV4IHx8IDAsIGl0ZW1zOiBpdGVtcywgcmFpc2VFdmVudDogdHJ1ZX0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c291dCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lICsgJy5tZC1mb2N1c2VkJyArIG1vZGlmaWVyKS5yZW1vdmVDbGFzcygnbWQtZm9jdXNlZCcpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG59KSgpO1xyXG5cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxyXG5cclxuKGZ1bmN0aW9uKCl7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIHRoaXNNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShcInBpcFVuc2F2ZWRDaGFuZ2VzXCIsIFtdKTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZShcInBpcFVuc2F2ZWRDaGFuZ2VzXCIsIGZ1bmN0aW9uICgkd2luZG93LCAkcm9vdFNjb3BlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBRScsXHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICB1bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0F2YWlsYWJsZScsXHJcbiAgICAgICAgICAgICAgICB1bnNhdmVkQ2hhbmdlc01lc3NhZ2U6ICdAcGlwVW5zYXZlZENoYW5nZXNNZXNzYWdlJyxcclxuICAgICAgICAgICAgICAgIGFmdGVyTGVhdmU6ICcmcGlwVW5zYXZlZENoYW5nZXNBZnRlckxlYXZlJyxcclxuICAgICAgICAgICAgICAgIGNhbmNlbExlYXZlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQ2FuY2VsTGVhdmUnXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZTogYW55KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgJHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUudW5zYXZlZENoYW5nZXNBdmFpbGFibGUoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRyb3V0aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIHVuYmluZEZ1bmMgPSAkc2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS51bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZSgpICYmICEkd2luZG93LmNvbmZpcm0oJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzTWVzc2FnZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kcm91dGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKCRzY29wZS5jYW5jZWxMZWF2ZSkgJiYgJHNjb3BlLmNhbmNlbExlYXZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKCRzY29wZS5hZnRlckxlYXZlKSAmJiAkc2NvcGUuYWZ0ZXJMZWF2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdW5iaW5kRnVuYygpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG59KSgpO1xyXG5cclxuIl19