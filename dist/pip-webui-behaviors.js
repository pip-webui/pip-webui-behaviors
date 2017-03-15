(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.pip || (g.pip = {})).behaviors = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('pipBehaviors', [
    'pipFocused',
    'pipSelected',
    'pipInfiniteScroll',
    'pipUnsavedChanges',
    'pipDraggable',
    'pipShortcuts'
]);
},{}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
{
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
}
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmVoYXZpb3JzLnRzIiwic3JjL2RyYWdnYWJsZS9kcmFnZ2FibGUudHMiLCJzcmMvZm9jdXNlZC9mb2N1c2VkLnRzIiwic3JjL2luZmluaXRlX3Njcm9sbC9pbmZpbml0ZVNjcm9sbC50cyIsInNyYy9rZXlib2FyZF9zaG9ydGN1dHMvS2V5Ym9hcmRTaG9ydGN1dC50cyIsInNyYy9rZXlib2FyZF9zaG9ydGN1dHMvU2hvcmN1dHNSZWdpc3RlclNlcnZpY2UudHMiLCJzcmMva2V5Ym9hcmRfc2hvcnRjdXRzL1Nob3J0Y3V0RGlyZWN0aXZlLnRzIiwic3JjL2tleWJvYXJkX3Nob3J0Y3V0cy9TaG9ydGN1dHNTZXJ2aWNlLnRzIiwic3JjL2tleWJvYXJkX3Nob3J0Y3V0cy9pbmRleC50cyIsInNyYy9zZWxlY3RlZC9zZWxlY3RlZC50cyIsInNyYy91bnNhdmVkX2NoYW5nZXMvdW5zYXZlZENoYW5nZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtJQUM1QixZQUFZO0lBQ1osYUFBYTtJQUNiLG1CQUFtQjtJQUNuQixtQkFBbUI7SUFDbkIsY0FBYztJQUNkLGNBQWM7Q0FDakIsQ0FBQyxDQUFDOztBQ05ILENBQUM7SUFDRyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVwRCxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRTtRQUUvQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDakIsS0FBSyxDQUFDLFVBQVUsR0FBRyxVQUFVLEtBQUs7WUFDOUIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9B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Q3pELEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDM0IsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDSixDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzNELENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFO2dCQUNuQixPQUFPLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztnQkFDOUIsVUFBVSxFQUFFLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBQ0wsMkJBQUM7SUFBRCxDQXpCQSxBQXlCQyxJQUFBO0lBRUQsSUFBTSxjQUFjLEdBQUcsVUFBVSxPQUEwQjtRQUN2RCxNQUFNLENBQUM7WUFDSCxRQUFRLEVBQUUsSUFBSTtZQUNkLEtBQUssRUFBRTtnQkFDSCx1QkFBdUIsRUFBRSw2QkFBNkI7Z0JBQ3RELHFCQUFxQixFQUFFLDJCQUEyQjtnQkFDbEQsVUFBVSxFQUFFLDhCQUE4QjtnQkFDMUMsV0FBVyxFQUFFLCtCQUErQjthQUMvQztZQUNELElBQUksRUFBRSxVQUFVLE1BQTJCO2dCQUN2QyxJQUFJLG9CQUFrQixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUM1QyxDQUFDO1NBQ0osQ0FBQztJQUNOLENBQUMsQ0FBQTtJQUVELE9BQU8sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO1NBQ2xDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxjQUFjLENBQUMsQ0FBQztBQUN4RCxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIu+7v2FuZ3VsYXIubW9kdWxlKCdwaXBCZWhhdmlvcnMnLCBbXHJcbiAgICAncGlwRm9jdXNlZCcsXHJcbiAgICAncGlwU2VsZWN0ZWQnLFxyXG4gICAgJ3BpcEluZmluaXRlU2Nyb2xsJyxcclxuICAgICdwaXBVbnNhdmVkQ2hhbmdlcycsXHJcbiAgICAncGlwRHJhZ2dhYmxlJyxcclxuICAgICdwaXBTaG9ydGN1dHMnXHJcbl0pOyIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxue1xyXG4gICAgdmFyIHRoaXNNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShcInBpcERyYWdnYWJsZVwiLCBbXSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5zZXJ2aWNlKCdwaXBEcmFnZ2FibGUnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XHJcbiAgICAgICAgc2NvcGUuaW5wdXRFdmVudCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoZXZlbnQudG91Y2hlcykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudC50b3VjaGVzWzBdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vQ2hlY2tpbmcgYm90aCBpcyBub3QgcmVkdW5kZW50LiBJZiBvbmx5IGNoZWNrIGlmIHRvdWNoZXMgaXNEZWZpbmVkLCBhbmd1bGFyanMgaXNEZWZuaWVkIHdpbGwgcmV0dXJuIGVycm9yIGFuZCBzdG9wIHRoZSByZW1haW5pbmcgc2NyaXB0eSBpZiBldmVudC5vcmlnaW5hbEV2ZW50IGlzIG5vdCBkZWZpbmVkLlxyXG4gICAgICAgICAgICBlbHNlIGlmIChhbmd1bGFyLmlzRGVmaW5lZChldmVudC5vcmlnaW5hbEV2ZW50KSAmJiBhbmd1bGFyLmlzRGVmaW5lZChldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBldmVudDtcclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBEcmFnJyxcclxuICAgICAgICBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHBhcnNlLCAkZG9jdW1lbnQsICR3aW5kb3csIHBpcERyYWdnYWJsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG5cclxuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGU6IGFueSwgZWxlbWVudCwgYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnZhbHVlID0gYXR0cnMubmdEcmFnO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBMT05HX1BSRVNTID0gNTA7IC8vIDUwbXMgZm9yIGxvbmdwcmVzc1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvZmZzZXQsIF9jZW50ZXJBbmNob3IgPSBmYWxzZSwgX214LCBfbXksIF90eCwgX3R5LCBfbXJ4LCBfbXJ5O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfaGFzVG91Y2ggPSAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KSB8fCAoPGFueT53aW5kb3cpLkRvY3VtZW50VG91Y2g7IC8vICYmIGRvY3VtZW50IGluc3RhbmNlb2YgRG9jdW1lbnRUb3VjaDsgLy8gRG9jdW1lbnRUb3VjaCBpcyBub3QgZGVmaW5lZCFcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX3ByZXNzRXZlbnRzID0gJ3RvdWNoc3RhcnQgbW91c2Vkb3duJztcclxuICAgICAgICAgICAgICAgICAgICB2YXIgX21vdmVFdmVudHMgPSAndG91Y2htb3ZlIG1vdXNlbW92ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9yZWxlYXNlRXZlbnRzID0gJ3RvdWNoZW5kIG1vdXNldXAnO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZHJhZ0hhbmRsZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdG8gaWRlbnRpZnkgdGhlIGVsZW1lbnQgaW4gb3JkZXIgdG8gcHJldmVudCBnZXR0aW5nIHN1cGVyZmxvdXMgZXZlbnRzIHdoZW4gYSBzaW5nbGUgZWxlbWVudCBoYXMgYm90aCBkcmFnIGFuZCBkcm9wIGRpcmVjdGl2ZXMgb24gaXQuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9teWlkID0gc2NvcGUuJGlkO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZGF0YSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZHJhZ09mZnNldCA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZHJhZ0VuYWJsZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9wcmVzc1RpbWVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9lbGVtZW50U3R5bGU6IGFueSA9IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3RhcnRDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RhcnQpIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N0b3BDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnU3RvcCkgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25EcmFnU3VjY2Vzc0NhbGxiYWNrID0gJHBhcnNlKGF0dHJzLnBpcERyYWdTdWNjZXNzKSB8fCBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhbGxvd1RyYW5zZm9ybSA9IGFuZ3VsYXIuaXNEZWZpbmVkKGF0dHJzLmFsbG93VHJhbnNmb3JtKSA/IHNjb3BlLiRldmFsKGF0dHJzLmFsbG93VHJhbnNmb3JtKSA6IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0RHJhZ0RhdGEgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNhbFNjcm9sbCA9IHRvQm9vbGVhbihhdHRycy5waXBWZXJ0aWNhbFNjcm9sbCkgfHwgdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXpvbnRhbFNjcm9sbCA9IHRvQm9vbGVhbihhdHRycy5waXBIb3Jpem9udGFsU2Nyb2xsKSB8fCB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmF0aW9uRGlzdGFuY2UgPSBwYXJzZUZsb2F0KGF0dHJzLnBpcEFjdGl2YXRpb25EaXN0YW5jZSkgfHwgNzUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbERpc3RhbmNlID0gcGFyc2VGbG9hdChhdHRycy5waXBTY3JvbGxEaXN0YW5jZSkgfHwgNTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFBhcmVudCA9IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHdpbmRvdyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lckdldHRlciA9ICRwYXJzZShhdHRycy5waXBTY3JvbGxDb250YWluZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBkZXJlZ2lzdHJhdGlvbiBmdW5jdGlvbiBmb3IgbW91c2UgbW92ZSBldmVudHMgaW4gJHJvb3RTY29wZSB0cmlnZ2VyZWQgYnkganFMaXRlIHRyaWdnZXIgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSBhbmd1bGFyLm5vb3A7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cigncGlwLWRyYWdnYWJsZScsICdmYWxzZScpOyAvLyBwcmV2ZW50IG5hdGl2ZSBkcmFnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiBkcmFnIGhhbmRsZShzKSB3YXMgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHF1ZXJ5U2VsZWN0b3JBbGwgaXMgYXZhaWxhYmxlLCB3ZSB1c2UgdGhpcyBpbnN0ZWFkIG9mIGZpbmRcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgSlFMaXRlIGZpbmQgaXMgbGltaXRlZCB0byB0YWduYW1lc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZHJhZ0hhbmRsZXM6IGFueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRbMF0ucXVlcnlTZWxlY3RvckFsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0hhbmRsZXMgPSBhbmd1bGFyLmVsZW1lbnQoZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yQWxsKCdbcGlwLWRyYWctaGFuZGxlXScpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYWdIYW5kbGVzID0gZWxlbWVudC5maW5kKCdbcGlwLWRyYWctaGFuZGxlXScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkcmFnSGFuZGxlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnSGFuZGxlID0gZHJhZ0hhbmRsZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY3JvbGwgY29udGFpbmVyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxQYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChlbGVtZW50LnBhcmVudCgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhdHRycy5waXBTY3JvbGxDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChzY3JvbGxDb250YWluZXJHZXR0ZXIoc2NvcGUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b0Jvb2xlYW4odmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09ICcxJyB8fCB2YWx1ZSA9PSAndHJ1ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZW5hYmxlKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGxpc3RlbmVycy5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBvbkRlc3Ryb3kpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goYXR0cnMucGlwRHJhZywgb25FbmFibGVDaGFuZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kd2F0Y2goYXR0cnMucGlwQ2VudGVyQW5jaG9yLCBvbkNlbnRlckFuY2hvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdpcmUgdXAgdG91Y2ggZXZlbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfZHJhZ0hhbmRsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlKHMpIHNwZWNpZmllZCwgdXNlIHRob3NlIHRvIGluaXRpYXRlIGRyYWdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnSGFuZGxlLm9uKF9wcmVzc0V2ZW50cywgb25wcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBubyBoYW5kbGUocykgc3BlY2lmaWVkLCB1c2UgdGhlIGVsZW1lbnQgYXMgdGhlIGhhbmRsZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5vbihfcHJlc3NFdmVudHMsIG9ucHJlc3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2hhc1RvdWNoICYmIGVsZW1lbnRbMF0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSBcImltZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7IC8vIHByZXZlbnQgbmF0aXZlIGRyYWcgZm9yIGltYWdlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRGVzdHJveShlbmFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlTGlzdGVuZXJzKGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uRW5hYmxlQ2hhbmdlKG5ld1ZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kcmFnRW5hYmxlZCA9IChuZXdWYWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25DZW50ZXJBbmNob3IobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKG5ld1ZhbCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2VudGVyQW5jaG9yID0gKG5ld1ZhbCB8fCAndHJ1ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaXNDbGlja2FibGVFbGVtZW50KGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5pc0RlZmluZWQoYW5ndWxhci5lbGVtZW50KGV2dC50YXJnZXQpLmF0dHIoXCJwaXAtY2FuY2VsLWRyYWdcIikpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvKlxyXG4gICAgICAgICAgICAgICAgICAgICAqIFdoZW4gdGhlIGVsZW1lbnQgaXMgY2xpY2tlZCBzdGFydCB0aGUgZHJhZyBiZWhhdmlvdXJcclxuICAgICAgICAgICAgICAgICAgICAgKiBPbiB0b3VjaCBkZXZpY2VzIGFzIGEgc21hbGwgZGVsYXkgc28gYXMgbm90IHRvIHByZXZlbnQgbmF0aXZlIHdpbmRvdyBzY3JvbGxpbmdcclxuICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbnByZXNzKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClyZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDbGlja2FibGVFbGVtZW50KGV2dCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2dC50eXBlID09IFwibW91c2Vkb3duXCIgJiYgZXZ0LmJ1dHRvbiAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEbyBub3Qgc3RhcnQgZHJhZ2dpbmcgb24gcmlnaHQtY2xpY2tcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZUVsZW1lbnRTdHlsZXMoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfaGFzVG91Y2gpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcHJlc3NUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25sb25ncHJlc3MoZXZ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIExPTkdfUFJFU1MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKF9tb3ZlRXZlbnRzLCBjYW5jZWxQcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX3JlbGVhc2VFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubG9uZ3ByZXNzKGV2dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBzYXZlRWxlbWVudFN0eWxlcygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS5sZWZ0ID0gZWxlbWVudC5jc3MoJ2NzcycpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lbGVtZW50U3R5bGUudG9wID0gZWxlbWVudC5jc3MoJ3RvcCcpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lbGVtZW50U3R5bGUucG9zaXRpb24gPSBlbGVtZW50LmNzcygncG9zaXRpb24nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2VsZW1lbnRTdHlsZS53aWR0aCA9IGVsZW1lbnQuY3NzKCd3aWR0aCcpOyAgICBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNhbmNlbFByZXNzKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3ByZXNzVGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub2ZmKF9tb3ZlRXZlbnRzLCBjYW5jZWxQcmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkb2N1bWVudC5vZmYoX3JlbGVhc2VFdmVudHMsIGNhbmNlbFByZXNzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ubG9uZ3ByZXNzKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcmFnRW5hYmxlZClyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFsbG93VHJhbnNmb3JtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdPZmZzZXQgPSBvZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2RyYWdPZmZzZXQgPSB7bGVmdDogZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0LCB0b3A6IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8YW55PmVsZW1lbnQpLmNlbnRlclggPSBlbGVtZW50WzBdLm9mZnNldFdpZHRoIC8gMjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxhbnk+ZWxlbWVudCkuY2VudGVyWSA9IGVsZW1lbnRbMF0ub2Zmc2V0SGVpZ2h0IC8gMjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9teCA9IHBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9teSA9IHBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9tcnggPSBfbXggLSBvZmZzZXQubGVmdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX21yeSA9IF9teSAtIG9mZnNldC50b3A7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfY2VudGVyQW5jaG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHggPSBfbXggLSAoPGFueT5lbGVtZW50KS5jZW50ZXJYIC0gJHdpbmRvdy5wYWdlWE9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eSA9IF9teSAtICg8YW55PmVsZW1lbnQpLmNlbnRlclkgLSAkd2luZG93LnBhZ2VZT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R4ID0gX214IC0gX21yeCAtICR3aW5kb3cucGFnZVhPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdHkgPSBfbXkgLSBfbXJ5IC0gJHdpbmRvdy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9uKF9tb3ZlRXZlbnRzLCBvbm1vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZG9jdW1lbnQub24oX3JlbGVhc2VFdmVudHMsIG9ucmVsZWFzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgZXZlbnQgaXMgdXNlZCB0byByZWNlaXZlIG1hbnVhbGx5IHRyaWdnZXJlZCBtb3VzZSBtb3ZlIGV2ZW50c1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBqcUxpdGUgdW5mb3J0dW5hdGVseSBvbmx5IHN1cHBvcnRzIHRyaWdnZXJIYW5kbGVyKC4uLilcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VlIGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS90cmlnZ2VySGFuZGxlci9cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJ2RyYWdnYWJsZTpfdHJpZ2dlckhhbmRsZXJNb3ZlJywgb25tb3ZlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJ2RyYWdnYWJsZTpfdHJpZ2dlckhhbmRsZXJNb3ZlJywgZnVuY3Rpb24gKGV2ZW50LCBvcmlnRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubW92ZShvcmlnRXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ubW92ZShldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJhZ0VuYWJsZWQpcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZWxlbWVudC5oYXNDbGFzcygncGlwLWRyYWdnaW5nJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9kYXRhID0gZ2V0RHJhZ0RhdGEoc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTpzdGFydCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBfbXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogX215LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR4OiBfdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHk6IF90eSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogX2RhdGFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkRyYWdTdGFydENhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnU3RhcnRDYWxsYmFjayhzY29wZSwgeyRkYXRhOiBfZGF0YSwgJGV2ZW50OiBldnR9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX214ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX215ID0gcGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChob3Jpem9udGFsU2Nyb2xsIHx8IHZlcnRpY2FsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnVG9TY3JvbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9jZW50ZXJBbmNob3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eCA9IF9teCAtICg8YW55PmVsZW1lbnQpLmNlbnRlclggLSBfZHJhZ09mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R5ID0gX215IC0gKDxhbnk+ZWxlbWVudCkuY2VudGVyWSAtIF9kcmFnT2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90eCA9IF9teCAtIF9tcnggLSBfZHJhZ09mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3R5ID0gX215IC0gX21yeSAtIF9kcmFnT2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZUVsZW1lbnQoX3R4LCBfdHkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdkcmFnZ2FibGU6bW92ZScsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IF9teCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IF9teSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR4OiBfdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eTogX3R5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGV2dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBfZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpZDogX215aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmFnT2Zmc2V0OiBfZHJhZ09mZnNldFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9ucmVsZWFzZShldnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfZHJhZ0VuYWJsZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTplbmQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBfbXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBfbXksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eDogX3R4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHk6IF90eSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBldnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogX2RhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogb25EcmFnQ29tcGxldGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aWQ6IF9teWlkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnQoKS5maW5kKCcucGlwLWRyYWctZW50ZXInKS5yZW1vdmVDbGFzcygncGlwLWRyYWctZW50ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzZXQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9mZihfbW92ZUV2ZW50cywgb25tb3ZlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRvY3VtZW50Lm9mZihfcmVsZWFzZUV2ZW50cywgb25yZWxlYXNlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkRyYWdTdG9wQ2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnU3RvcENhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IF9kYXRhLCAkZXZlbnQ6IGV2dH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnQ29tcGxldGUoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb25EcmFnU3VjY2Vzc0NhbGxiYWNrKXJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdWNjZXNzQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogX2RhdGEsICRldmVudDogZXZ0fSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVzZXQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbGxvd1RyYW5zZm9ybSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHt0cmFuc2Zvcm06ICcnLCAnei1pbmRleCc6ICcnLCAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnJywgJy1tcy10cmFuc2Zvcm0nOiAnJ30pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHsncG9zaXRpb24nOiBfZWxlbWVudFN0eWxlLnBvc2l0aW9uLCB0b3A6IF9lbGVtZW50U3R5bGUudG9wLCBsZWZ0OiBfZWxlbWVudFN0eWxlLmxlZnQsICd6LWluZGV4JzogJycsIHdpZHRoOiBfZWxlbWVudFN0eWxlLndpZHRofSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG1vdmVFbGVtZW50KHgsIHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVXaWR0aCA9IGVsZW1lbnQuY3NzKCd3aWR0aCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWxsb3dUcmFuc2Zvcm0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06ICdtYXRyaXgzZCgxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAnICsgeCArICcsICcgKyB5ICsgJywgMCwgMSknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd6LWluZGV4JzogOTk5OTksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJy13ZWJraXQtdHJhbnNmb3JtJzogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJy1tcy10cmFuc2Zvcm0nOiAnbWF0cml4KDEsIDAsIDAsIDEsICcgKyB4ICsgJywgJyArIHkgKyAnKSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsZWZ0JzogeCArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RvcCc6IHkgKyAncHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdwb3NpdGlvbic6ICdmaXhlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiAxMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGVXaWR0aFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGRyYWdUb1Njcm9sbCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjcm9sbFggPSAwLCBzY3JvbGxZID0gMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0KCkgfHwge2xlZnQ6IDAsIHRvcDogMH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhvcml6b250YWxTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckxlZnQgPSBvZmZzZXQoc2Nyb2xsQ29udGFpbmVyKS5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcldpZHRoID0gc2Nyb2xsQ29udGFpbmVyLmlubmVyV2lkdGgoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJSaWdodCA9IGNvbnRhaW5lckxlZnQgKyBjb250YWluZXJXaWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKF9teCAtIGNvbnRhaW5lckxlZnQpIDwgYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWCA9IC1zY3JvbGxEaXN0YW5jZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKChjb250YWluZXJSaWdodCAtIF9teCkgPCBhY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxYID0gc2Nyb2xsRGlzdGFuY2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ZXJ0aWNhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyVG9wID0gb2Zmc2V0KHNjcm9sbENvbnRhaW5lcikudG9wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IHNjcm9sbENvbnRhaW5lci5pbm5lckhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IGNvbnRhaW5lclRvcCArIGNvbnRhaW5lckhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKF9teSAtIGNvbnRhaW5lclRvcCkgPCBhY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxZID0gLXNjcm9sbERpc3RhbmNlICsgMzA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgoY29udGFpbmVyQm90dG9tIC0gX215KSA8IGFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFkgPSBzY3JvbGxEaXN0YW5jZSAtIDMwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxYICE9PSAwIHx8IHNjcm9sbFkgIT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhclxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbExlZnQgPSBzY3JvbGxDb250YWluZXIuc2Nyb2xsTGVmdCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbFRvcCA9IHNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIuc2Nyb2xsTGVmdChjb250YWluZXJTY3JvbGxMZWZ0ICsgc2Nyb2xsWCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIHNjcm9sbFkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIHRoaXNNb2R1bGUuZGlyZWN0aXZlKCdwaXBEcm9wJywgXHJcbiAgICAgICAgZnVuY3Rpb24gKCRwYXJzZSwgJHRpbWVvdXQsICR3aW5kb3csICRkb2N1bWVudCwgcGlwRHJhZ2dhYmxlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlOiBhbnksIGVsZW1lbnQsIGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLnZhbHVlID0gYXR0cnMucGlwRHJvcDtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmlzVG91Y2hpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgX2xhc3REcm9wVG91Y2ggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdmFyIF9teWlkID0gc2NvcGUuJGlkO1xyXG4gICAgICAgICAgICAgICAgdmFyIF9kcm9wRW5hYmxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBvbkRyb3BDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcm9wU3VjY2Vzcyk7Ly8gfHwgZnVuY3Rpb24oKXt9O1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJhZ1N0YXJ0Q2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N0YXJ0KTtcclxuICAgICAgICAgICAgICAgIHZhciBvbkRyYWdTdG9wQ2FsbGJhY2sgPSAkcGFyc2UoYXR0cnMucGlwRHJhZ1N0b3ApO1xyXG4gICAgICAgICAgICAgICAgdmFyIG9uRHJhZ01vdmVDYWxsYmFjayA9ICRwYXJzZShhdHRycy5waXBEcmFnTW92ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaW5pdGlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZW5hYmxlKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiR3YXRjaChhdHRycy5waXBEcm9wLCBvbkVuYWJsZUNoYW5nZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIG9uRGVzdHJveSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6c3RhcnQnLCBvbkRyYWdTdGFydCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdkcmFnZ2FibGU6bW92ZScsIG9uRHJhZ01vdmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLiRvbignZHJhZ2dhYmxlOmVuZCcsIG9uRHJhZ0VuZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EZXN0cm95KGVuYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyhmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICBfZHJvcEVuYWJsZWQgPSBuZXdWYWw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnU3RhcnQoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIV9kcm9wRW5hYmxlZClyZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLnBpcERyYWdTdGFydCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdGFydENhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IG9iai5kYXRhLCAkZXZlbnQ6IG9ian0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnTW92ZShldnQsIG9iaikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX2Ryb3BFbmFibGVkKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICBpc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMucGlwRHJhZ01vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25EcmFnTW92ZUNhbGxiYWNrKHNjb3BlLCB7JGRhdGE6IG9iai5kYXRhLCAkZXZlbnQ6IG9ian0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25EcmFnRW5kKGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZG9uJ3QgbGlzdGVuIHRvIGRyb3AgZXZlbnRzIGlmIHRoaXMgaXMgdGhlIGVsZW1lbnQgYmVpbmcgZHJhZ2dlZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgdXBkYXRlIHRoZSBzdHlsZXMgYW5kIHJldHVyblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghX2Ryb3BFbmFibGVkIHx8IF9teWlkID09PSBvYmoudWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZURyYWdTdHlsZXMoZmFsc2UsIG9iai5lbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVG91Y2hpbmcob2JqLngsIG9iai55LCBvYmouZWxlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FsbCB0aGUgcGlwRHJhZ2dhYmxlIHBpcERyYWdTdWNjZXNzIGVsZW1lbnQgY2FsbGJhY2tcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iai5jYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqLmNhbGxiYWNrKG9iaik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5waXBEcm9wU3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRHJvcENhbGxiYWNrKHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRkYXRhOiBvYmouZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBvYmosXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0YXJnZXQ6IHNjb3BlLiRldmFsKHNjb3BlLnZhbHVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5waXBEcmFnU3RvcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdG9wQ2FsbGJhY2soc2NvcGUsIHskZGF0YTogb2JqLmRhdGEsICRldmVudDogb2JqfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlRHJhZ1N0eWxlcyhmYWxzZSwgb2JqLmVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGlzVG91Y2hpbmcobW91c2VYLCBtb3VzZVksIGRyYWdFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRvdWNoaW5nID0gaGl0VGVzdChtb3VzZVgsIG1vdXNlWSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuaXNUb3VjaGluZyA9IHRvdWNoaW5nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0b3VjaGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbGFzdERyb3BUb3VjaCA9IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZURyYWdTdHlsZXModG91Y2hpbmcsIGRyYWdFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG91Y2hpbmc7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlRHJhZ1N0eWxlcyh0b3VjaGluZywgZHJhZ0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodG91Y2hpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWctZW50ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZ0VsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1kcmFnLW92ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF9sYXN0RHJvcFRvdWNoID09IGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2xhc3REcm9wVG91Y2ggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkcmFnRWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaGl0VGVzdCh4LCB5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJvdW5kcyA9IGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgeCAtPSAkZG9jdW1lbnRbMF0uYm9keS5zY3JvbGxMZWZ0ICsgJGRvY3VtZW50WzBdLmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgIHkgLT0gJGRvY3VtZW50WzBdLmJvZHkuc2Nyb2xsVG9wICsgJGRvY3VtZW50WzBdLmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHggPj0gYm91bmRzLmxlZnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgeCA8PSBib3VuZHMucmlnaHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgeSA8PSBib3VuZHMuYm90dG9tXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIHkgPj0gYm91bmRzLnRvcDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwUHJldmVudERyYWcnLCBmdW5jdGlvbiAoJHBhcnNlLCAkdGltZW91dCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZTogYW55LCBlbGVtZW50LCBhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cigncGlwLWRyYWdnYWJsZScsICdmYWxzZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZW5hYmxlKXJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIGFic29yYkV2ZW50Xyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gYWJzb3JiRXZlbnRfKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGUgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQgJiYgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uICYmIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcENhbmNlbERyYWcnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5maW5kKCcqJykuYXR0cigncGlwLWNhbmNlbC1kcmFnJywgJ3BpcC1jYW5jZWwtZHJhZycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4iLCJ7XHJcbiAgICB2YXIgdGhpc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKFwicGlwRm9jdXNlZFwiLCBbXSk7XHJcblxyXG4gICAgdGhpc01vZHVsZS5kaXJlY3RpdmUoJ3BpcEZvY3VzZWQnLCBmdW5jdGlvbiAoJHRpbWVvdXQsICRtZENvbnN0YW50LCAkd2luZG93KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgLy8gcmVzdHJpY3Q6ICdFQScsXHJcbiAgICAgICAgICAgIHJlcXVpcmU6IFwiP25nTW9kZWxcIixcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZTogYW55LCAkZWxlbWVudCwgJGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBjb250cm9scywgY29udHJvbHNMZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgd2l0aEhpZGRlbiA9ICRhdHRycy5waXBXaXRoSGlkZGVuLFxyXG4gICAgICAgICAgICAgICAgICAgIG9wYWNpdHlEZWx0YSA9IDAuNCxcclxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5TGltaXQgPSAwLjUsXHJcbiAgICAgICAgICAgICAgICAgICAgX2NvbG9yLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvY3VzZWRDb2xvciA9ICRhdHRycy5waXBGb2N1c2VkQ29sb3IgPyAkYXR0cnMucGlwRm9jdXNlZENvbG9yIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICByZUluaXQgPSAkYXR0cnMucGlwRm9jdXNlZFJlYmluZCA/ICRhdHRycy5waXBGb2N1c2VkUmViaW5kIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBmb2N1c2VkVGFiaW5kZXggPSAkYXR0cnMucGlwRm9jdXNlZFRhYmluZGV4ID8gcGFyc2VJbnQoJGF0dHJzLnBpcEZvY3VzZWRUYWJpbmRleCkgfHwgMCA6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNPcGFjaXR5ID0gJGF0dHJzLnBpcEZvY3VzZWRPcGFjaXR5ID8gdG9Cb29sZWFuKCRhdHRycy5waXBGb2N1c2VkT3BhY2l0eSkgOiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAkdGltZW91dChpbml0KTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdrZXlkb3duJywga2V5ZG93bkxpc3RlbmVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoJGF0dHJzLm5nTW9kZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCRhdHRycy5uZ01vZGVsLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGluaXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICgkYXR0cnMucGlwRm9jdXNlZERhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAkYXR0cnMuJG9ic2VydmUoJ3BpcEZvY3VzZWREYXRhJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChpbml0KTtcclxuICAgICAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIH0gICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIENvbnZlcnRzIHZhbHVlIGludG8gYm9vbGVhblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdG9Cb29sZWFuKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09ICcxJyB8fCB2YWx1ZSA9PSAndHJ1ZSc7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJnYmEoY29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZm9jdXNlZENvbG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmb2N1c2VkQ29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXJyID0gY29sb3Iuc3BsaXQoXCIoXCIpWzFdLnNwbGl0KFwiKVwiKVswXS5zcGxpdChcIixcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghYXJyIHx8IGFyci5sZW5ndGggPCAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlZCwgYmx1ZSwgZ3JlZW4sIG9wYWNpdHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIG9wYWNpdHkgPSBhcnIubGVuZ3RoID09IDMgPyAxIDogcGFyc2VGbG9hdChhcnJbM10pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlZCA9IGFyclswXTtcclxuICAgICAgICAgICAgICAgICAgICBibHVlID0gYXJyWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIGdyZWVuID0gYXJyWzJdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BhY2l0eSA8IG9wYWNpdHlMaW1pdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5ICs9IG9wYWNpdHlEZWx0YTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5IC09IG9wYWNpdHlEZWx0YTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAncmdiYSgnICsgcmVkICsgJywgJyArIGJsdWUgKyAnLCAnICsgZ3JlZW4gKyAnLCAnICsgb3BhY2l0eSArICcpJztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzZXRUYWJpbmRleChlbGVtZW50LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tUYWJpbmRleChjb250cm9scykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmRleCA9IF8uZmluZEluZGV4KGNvbnRyb2xzLCAoYykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY1sndGFiaW5kZXgnXSA+IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT0gLTEgJiYgY29udHJvbHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgZWwgPSBjb250cm9sc1swXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGFiaW5kZXgoYW5ndWxhci5lbGVtZW50KGNvbnRyb2xzWzBdKSwgZm9jdXNlZFRhYmluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSB3aXRoSGlkZGVuID8gJy5waXAtZm9jdXNhYmxlJyA6ICcucGlwLWZvY3VzYWJsZTp2aXNpYmxlJztcclxuICAgICAgICAgICAgICAgICAgICBjb250cm9scyA9ICRlbGVtZW50LmZpbmQoc2VsZWN0b3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xzTGVuZ3RoID0gY29udHJvbHMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrVGFiaW5kZXgoY29udHJvbHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBuZWVkZWQgZXZlbnQgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbHMub24oJ2ZvY3VzJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5oYXNDbGFzcygnbWQtZm9jdXNlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlSW5pdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzT3BhY2l0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVsbCA9IGFuZ3VsYXIuZWxlbWVudCgkKHRoaXMpWzBdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY29sb3IgPSAkKHRoaXMpLmNzcygnYmFja2dyb3VuZENvbG9yJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBfY29sb3IgPSAkd2luZG93LmdldENvbXB1dGVkU3R5bGUoJCh0aGlzKVswXSwgbnVsbCkuYmFja2dyb3VuZENvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIHJnYmEoX2NvbG9yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmFkZENsYXNzKCdtZC1mb2N1c2VkIG1kLWZvY3VzZWQtb3BhY2l0eScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZXRUYWJpbmRleChhbmd1bGFyLmVsZW1lbnQoJCh0aGlzKVswXSksIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pLm9uKCdmb2N1c291dCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEkKHRoaXMpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWZvY3VzZWQtY29udGFpbmVyJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNPcGFjaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAkKHRoaXMpLmNzcygnYmFja2dyb3VuZENvbG9yJywgX2NvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCBcIlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQgbWQtZm9jdXNlZC1vcGFjaXR5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgSSBnbyBmcm9tIGJsb2NrIGFsbCBlbGVtZW50IGhhdmUgdGFiaW5kZXggPSAtMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZXRUYWJpbmRleChhbmd1bGFyLmVsZW1lbnQoJCh0aGlzKVswXSksIC0xKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBrZXlkb3duTGlzdGVuZXIoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlDb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgY29udHJvbCBrZXlDb2RlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuTEVGVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluY3JlbWVudCA9IChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykgPyAxIDogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb3ZlVG9Db250cm9sID0gY29udHJvbHMuaW5kZXgoY29udHJvbHMuZmlsdGVyKFwiLm1kLWZvY3VzZWRcIikpICsgaW5jcmVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNb3ZlIGZvY3VzIHRvIG5leHQgY29udHJvbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobW92ZVRvQ29udHJvbCA+PSAwICYmIG1vdmVUb0NvbnRyb2wgPCBjb250cm9sc0xlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbHNbbW92ZVRvQ29udHJvbF0uZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9KTtcclxufVxyXG5cclxuIiwie1xyXG4gICAgdmFyIHRoaXNNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShcInBpcEluZmluaXRlU2Nyb2xsXCIsIFtdKTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwSW5maW5pdGVTY3JvbGwnLCBcclxuICAgICAgICBmdW5jdGlvbigkcm9vdFNjb3BlLCAkd2luZG93LCAkaW50ZXJ2YWwsICRwYXJzZSkge1xyXG4gICAgICAgICAgICB2YXIgVEhST1RUTEVfTUlMTElTRUNPTkRTID0gNTAwO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGlwSW5maW5pdGVTY3JvbGw6ICcmJyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxDb250YWluZXI6ICc9JyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxEaXN0YW5jZTogJz0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcFNjcm9sbERpc2FibGVkOiAnPScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b206ICc9JyxcclxuICAgICAgICAgICAgICAgICAgICBwaXBTY3JvbGxMaXN0ZW5Gb3JFdmVudDogJ0AnXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlOiBhbnksICRlbGVtZW50LCAkYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tXaGVuRW5hYmxlZCA9IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1tZWRpYXRlQ2hlY2sgPSB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxEaXN0YW5jZSA9IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbEVuYWJsZWQgPSBudWxsLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VEb2N1bWVudEJvdHRvbSA9IGZhbHNlLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93RWxlbWVudCA9IGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoZWlnaHQoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXSB8fCBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYU4oZWxlbWVudC5vZmZzZXRIZWlnaHQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb2Zmc2V0VG9wKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCB8fCBlbGVtZW50LmNzcygnbm9uZScpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICsgcGFnZVlPZmZzZXQoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcGFnZVlPZmZzZXQoZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXSB8fCBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYU4od2luZG93LnBhZ2VZT2Zmc2V0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50Lm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgb25Db250YWluZXJTY3JvbGwgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbWFpbmluZywgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRTY3JvbGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsQ29udGFpbmVyID09PSB3aW5kb3dFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBoZWlnaHQoc2Nyb2xsQ29udGFpbmVyKSArIHBhZ2VZT2Zmc2V0KHNjcm9sbENvbnRhaW5lclswXS5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSA9IG9mZnNldFRvcCgkZWxlbWVudCkgKyBoZWlnaHQoJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gaGVpZ2h0KHNjcm9sbENvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9mZnNldFRvcChzY3JvbGxDb250YWluZXIpICE9PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQgPSBvZmZzZXRUb3Aoc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSBvZmZzZXRUb3AoJGVsZW1lbnQpIC0gY29udGFpbmVyVG9wT2Zmc2V0ICsgaGVpZ2h0KCRlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVzZURvY3VtZW50Qm90dG9tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gaGVpZ2h0KCgkZWxlbWVudFswXS5vd25lckRvY3VtZW50IHx8ICg8YW55PiRlbGVtZW50WzBdKS5kb2N1bWVudCkuZG9jdW1lbnRFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtYWluaW5nID0gZWxlbWVudEJvdHRvbSAtIGNvbnRhaW5lckJvdHRvbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdWxkU2Nyb2xsID0gcmVtYWluaW5nIDw9IGhlaWdodChzY3JvbGxDb250YWluZXIpICogc2Nyb2xsRGlzdGFuY2UgKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNob3VsZFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tXaGVuRW5hYmxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuJCRwaGFzZSB8fCAkcm9vdFNjb3BlLiQkcGhhc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5waXBJbmZpbml0ZVNjcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuJGFwcGx5KCRzY29wZS5waXBJbmZpbml0ZVNjcm9sbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoZWNrV2hlbkVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChUSFJPVFRMRV9NSUxMSVNFQ09ORFMgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNvbnRhaW5lclNjcm9sbCA9IF8udGhyb3R0bGUob25Db250YWluZXJTY3JvbGwsIFRIUk9UVExFX01JTExJU0VDT05EUyk7ICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lci51bmJpbmQoJ3Njcm9sbCcsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVucmVnaXN0ZXJFdmVudExpc3RlbmVyICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucmVnaXN0ZXJFdmVudExpc3RlbmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbERpc3RhbmNlKHYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjcm9sbERpc3RhbmNlID0gcGFyc2VGbG9hdCh2KSB8fCAwO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsRGlzdGFuY2UnLCBoYW5kbGVTY3JvbGxEaXN0YW5jZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsRGlzdGFuY2UoJHNjb3BlLnBpcFNjcm9sbERpc3RhbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVTY3JvbGxEaXNhYmxlZCh2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbEVuYWJsZWQgPSAhdjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbEVuYWJsZWQgJiYgY2hlY2tXaGVuRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tXaGVuRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9uQ29udGFpbmVyU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbERpc2FibGVkJywgaGFuZGxlU2Nyb2xsRGlzYWJsZWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZVNjcm9sbERpc2FibGVkKCRzY29wZS5waXBTY3JvbGxEaXNhYmxlZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKHYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVzZURvY3VtZW50Qm90dG9tID0gdjtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tJywgaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20pO1xyXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKCRzY29wZS5waXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoYW5nZUNvbnRhaW5lcihuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbENvbnRhaW5lciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxDb250YWluZXIudW5iaW5kKCdzY3JvbGwnLCBvbkNvbnRhaW5lclNjcm9sbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbENvbnRhaW5lciA9IG5ld0NvbnRhaW5lcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2Nyb2xsQ29udGFpbmVyLmJpbmQoJ3Njcm9sbCcsIG9uQ29udGFpbmVyU2Nyb2xsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZUNvbnRhaW5lcih3aW5kb3dFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnBpcFNjcm9sbExpc3RlbkZvckV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVucmVnaXN0ZXJFdmVudExpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJHNjb3BlLnBpcFNjcm9sbExpc3RlbkZvckV2ZW50LCBvbkNvbnRhaW5lclNjcm9sbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVTY3JvbGxDb250YWluZXIobmV3Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgobmV3Q29udGFpbmVyID09IG51bGwpIHx8IG5ld0NvbnRhaW5lci5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChuZXdDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBuZXdDb250YWluZXIuYXBwZW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQobmV3Q29udGFpbmVyW25ld0NvbnRhaW5lci5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld0NvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9ICRlbGVtZW50LnBhcmVudHMoKS5maW5kKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIgIT0gbnVsbCAmJiAoIUFycmF5LmlzQXJyYXkobmV3Q29udGFpbmVyKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKEFycmF5LmlzQXJyYXkobmV3Q29udGFpbmVyKSAmJiBuZXdDb250YWluZXIubGVuZ3RoID4gMCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hhbmdlQ29udGFpbmVyKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHBpcC1zY3JvbGwtY29udGFpbmVyIGF0dHJpYnV0ZS5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbENvbnRhaW5lcicsIGZ1bmN0aW9uIChuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPT0gc2Nyb2xsQ29udGFpbmVyKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsQ29udGFpbmVyKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU2Nyb2xsQ29udGFpbmVyKCRzY29wZS5waXBTY3JvbGxDb250YWluZXIgfHwgW10pO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkYXR0cnMucGlwU2Nyb2xsUGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlQ29udGFpbmVyKGFuZ3VsYXIuZWxlbWVudCgkZWxlbWVudC5wYXJlbnQoKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoJGF0dHJzLnBpcFNjcm9sSW1tZWRpYXRlQ2hlY2sgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbW1lZGlhdGVDaGVjayA9ICRzY29wZS4kZXZhbCgkYXR0cnMucGlwU2Nyb2xJbW1lZGlhdGVDaGVjayk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkaW50ZXJ2YWwoKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1tZWRpYXRlQ2hlY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvbkNvbnRhaW5lclNjcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSksIDAsIDEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxufVxyXG5cclxuIiwiZXhwb3J0IGNsYXNzIFNob3J0Y3V0T3B0aW9uIHtcclxuICAgIFR5cGU6IEtleWJvYXJkRXZlbnQ7XHJcbiAgICBQcm9wYWdhdGU6IGJvb2xlYW47XHJcbiAgICBEaXNhYmxlSW5JbnB1dDogYm9vbGVhbjtcclxuICAgIFRhcmdldDogYW55OyAvLyBFdmVudCB0YXJnZXQgb2JqZWN0XHJcbiAgICBLZXljb2RlOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBLZXlib2FyZEV2ZW50IHtcclxuICAgIHN0YXRpYyBLZXlkb3duOiBzdHJpbmcgPSAna2V5ZG93bic7XHJcbiAgICBzdGF0aWMgS2V5dXA6IHN0cmluZyA9ICdrZXl1cCc7XHJcbiAgICBzdGF0aWMgS2V5cHJlc3M6IHN0cmluZyA9ICdrZXlwcmVzcyc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBLZXlib2FyZFNob3J0Y3V0IHtcclxuICAgIHByaXZhdGUgc2hpZnRfbnVtcyA9IHtcclxuICAgICAgICBcImBcIjogXCJ+XCIsXHJcbiAgICAgICAgXCIxXCI6IFwiIVwiLFxyXG4gICAgICAgIFwiMlwiOiBcIkBcIixcclxuICAgICAgICBcIjNcIjogXCIjXCIsXHJcbiAgICAgICAgXCI0XCI6IFwiJFwiLFxyXG4gICAgICAgIFwiNVwiOiBcIiVcIixcclxuICAgICAgICBcIjZcIjogXCJeXCIsXHJcbiAgICAgICAgXCI3XCI6IFwiJlwiLFxyXG4gICAgICAgIFwiOFwiOiBcIipcIixcclxuICAgICAgICBcIjlcIjogXCIoXCIsXHJcbiAgICAgICAgXCIwXCI6IFwiKVwiLFxyXG4gICAgICAgIFwiLVwiOiBcIl9cIixcclxuICAgICAgICBcIj1cIjogXCIrXCIsXHJcbiAgICAgICAgXCI7XCI6IFwiOlwiLFxyXG4gICAgICAgIFwiJ1wiOiBcIlxcXCJcIixcclxuICAgICAgICBcIixcIjogXCI8XCIsXHJcbiAgICAgICAgXCIuXCI6IFwiPlwiLFxyXG4gICAgICAgIFwiL1wiOiBcIj9cIixcclxuICAgICAgICBcIlxcXFxcIjogXCJ8XCJcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBzcGVjaWFsX2tleXMgPSB7XHJcbiAgICAgICAgJ2VzYyc6IDI3LFxyXG4gICAgICAgICdlc2NhcGUnOiAyNyxcclxuICAgICAgICAndGFiJzogOSxcclxuICAgICAgICAnc3BhY2UnOiAzMixcclxuICAgICAgICAncmV0dXJuJzogMTMsXHJcbiAgICAgICAgJ2VudGVyJzogMTMsXHJcbiAgICAgICAgJ2JhY2tzcGFjZSc6IDgsXHJcblxyXG4gICAgICAgICdzY3JvbGxsb2NrJzogMTQ1LFxyXG4gICAgICAgICdzY3JvbGxfbG9jayc6IDE0NSxcclxuICAgICAgICAnc2Nyb2xsJzogMTQ1LFxyXG4gICAgICAgICdjYXBzbG9jayc6IDIwLFxyXG4gICAgICAgICdjYXBzX2xvY2snOiAyMCxcclxuICAgICAgICAnY2Fwcyc6IDIwLFxyXG4gICAgICAgICdudW1sb2NrJzogMTQ0LFxyXG4gICAgICAgICdudW1fbG9jayc6IDE0NCxcclxuICAgICAgICAnbnVtJzogMTQ0LFxyXG5cclxuICAgICAgICAncGF1c2UnOiAxOSxcclxuICAgICAgICAnYnJlYWsnOiAxOSxcclxuXHJcbiAgICAgICAgJ2luc2VydCc6IDQ1LFxyXG4gICAgICAgICdob21lJzogMzYsXHJcbiAgICAgICAgJ2RlbGV0ZSc6IDQ2LFxyXG4gICAgICAgICdlbmQnOiAzNSxcclxuXHJcbiAgICAgICAgJ3BhZ2V1cCc6IDMzLFxyXG4gICAgICAgICdwYWdlX3VwJzogMzMsXHJcbiAgICAgICAgJ3B1JzogMzMsXHJcblxyXG4gICAgICAgICdwYWdlZG93bic6IDM0LFxyXG4gICAgICAgICdwYWdlX2Rvd24nOiAzNCxcclxuICAgICAgICAncGQnOiAzNCxcclxuXHJcbiAgICAgICAgJ2xlZnQnOiAzNyxcclxuICAgICAgICAndXAnOiAzOCxcclxuICAgICAgICAncmlnaHQnOiAzOSxcclxuICAgICAgICAnZG93bic6IDQwLFxyXG5cclxuICAgICAgICAnZjEnOiAxMTIsXHJcbiAgICAgICAgJ2YyJzogMTEzLFxyXG4gICAgICAgICdmMyc6IDExNCxcclxuICAgICAgICAnZjQnOiAxMTUsXHJcbiAgICAgICAgJ2Y1JzogMTE2LFxyXG4gICAgICAgICdmNic6IDExNyxcclxuICAgICAgICAnZjcnOiAxMTgsXHJcbiAgICAgICAgJ2Y4JzogMTE5LFxyXG4gICAgICAgICdmOSc6IDEyMCxcclxuICAgICAgICAnZjEwJzogMTIxLFxyXG4gICAgICAgICdmMTEnOiAxMjIsXHJcbiAgICAgICAgJ2YxMic6IDEyM1xyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIG1vZGlmaWVycyA9IHtcclxuICAgICAgICBzaGlmdDogeyB3YW50ZWQ6IGZhbHNlLCBwcmVzc2VkOiBmYWxzZSB9LFxyXG4gICAgICAgIGN0cmw6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfSxcclxuICAgICAgICBhbHQ6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfSxcclxuICAgICAgICBtZXRhOiB7IHdhbnRlZDogZmFsc2UsIHByZXNzZWQ6IGZhbHNlIH1cdC8vIE1ldGEgaXMgTWFjIHNwZWNpZmljXHJcbiAgICB9O1xyXG5cclxuICAgIHB1YmxpYyBldmVudENhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgIHB1YmxpYyB0YXJnZXQ6IGFueTtcclxuICAgIHB1YmxpYyBldmVudDogS2V5Ym9hcmRFdmVudDtcclxuICAgIHB1YmxpYyBvcHRpb246IFNob3J0Y3V0T3B0aW9uO1xyXG4gICAgcHVibGljIHNob3JjdXQ6IHN0cmluZztcclxuICAgIHB1YmxpYyBjYWxsYmFjazogRnVuY3Rpb247XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIGVsZW1lbnQ6IGFueSxcclxuICAgICAgICBzaG9yY3V0Q29tYmluYXRpb246IHN0cmluZyxcclxuICAgICAgICBvcHRpb246IFNob3J0Y3V0T3B0aW9uLFxyXG4gICAgICAgIGNhbGxiYWNrOiAoZT86IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB2b2lkXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgIHRoaXMudGFyZ2V0ID0gZWxlbWVudDtcclxuICAgICAgICB0aGlzLnNob3JjdXQgPSBzaG9yY3V0Q29tYmluYXRpb247XHJcbiAgICAgICAgdGhpcy5ldmVudCA9IG9wdGlvbi5UeXBlO1xyXG4gICAgICAgIHRoaXMub3B0aW9uID0gb3B0aW9uO1xyXG4gICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcclxuXHJcbiAgICAgICAgdGhpcy5ldmVudENhbGxiYWNrID0gKGV2ZW50OiBKUXVlcnlFdmVudE9iamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZTogSlF1ZXJ5RXZlbnRPYmplY3QgPSBldmVudCB8fCA8SlF1ZXJ5RXZlbnRPYmplY3Q+d2luZG93LmV2ZW50O1xyXG4gICAgICAgICAgICBsZXQgY29kZTogbnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9uLkRpc2FibGVJbklucHV0KSB7IC8vIERpc2FibGUgc2hvcnRjdXQga2V5cyBpbiBJbnB1dCwgVGV4dGFyZWEgZmllbGRzXHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDtcclxuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlLnRhcmdldDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5zcmNFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGUuc3JjRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5ub2RlVHlwZSA9PSAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnRhZ05hbWUgPT0gJ0lOUFVUJyB8fCBlbGVtZW50LnRhZ05hbWUgPT0gJ1RFWFRBUkVBJykgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIEZpbmQgV2hpY2gga2V5IGlzIHByZXNzZWRcclxuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSkge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IGUua2V5Q29kZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChlLndoaWNoKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gZS53aGljaDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGNoYXJhY3RlciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb2RlID09IDE4OCkgY2hhcmFjdGVyID0gXCIsXCI7IC8vIElmIHRoZSB1c2VyIHByZXNzZXMsIHdoZW4gdGhlIHR5cGUgaXMgb25rZXlkb3duXHJcbiAgICAgICAgICAgIGlmIChjb2RlID09IDE5MCkgY2hhcmFjdGVyID0gXCIuXCI7IC8vIElmIHRoZSB1c2VyIHByZXNzZXMsIHdoZW4gdGhlIHR5cGUgaXMgb25rZXlkb3duXHJcblxyXG4gICAgICAgICAgICBsZXQga2V5czogc3RyaW5nW10gPSB0aGlzLnNob3JjdXQuc3BsaXQoXCIrXCIpO1xyXG4gICAgICAgICAgICAvLyBLZXkgUHJlc3NlZCAtIGNvdW50cyB0aGUgbnVtYmVyIG9mIHZhbGlkIGtleXByZXNzZXMgLSBpZiBpdCBpcyBzYW1lIGFzIHRoZSBudW1iZXIgb2Yga2V5cywgdGhlIHNob3J0Y3V0IGZ1bmN0aW9uIGlzIGludm9rZWRcclxuICAgICAgICAgICAgbGV0IGtwOiBudW1iZXIgPSAwO1xyXG5cclxuICAgICAgICAgICAgaWYgKGUuY3RybEtleSkgdGhpcy5tb2RpZmllcnMuY3RybC5wcmVzc2VkID0gZS5jdHJsS2V5O1xyXG4gICAgICAgICAgICBpZiAoZS5zaGlmdEtleSkgdGhpcy5tb2RpZmllcnMuc2hpZnQucHJlc3NlZCA9IGUuc2hpZnRLZXk7XHJcbiAgICAgICAgICAgIGlmIChlLmFsdEtleSkgdGhpcy5tb2RpZmllcnMuYWx0LnByZXNzZWQgPSBlLmFsdEtleTtcclxuICAgICAgICAgICAgaWYgKGUubWV0YUtleSkgdGhpcy5tb2RpZmllcnMubWV0YS5wcmVzc2VkID0gZS5tZXRhS2V5O1xyXG5cclxuICAgICAgICAgICAgbGV0IGk6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgazogc3RyaW5nID0ga2V5c1tpXTtcclxuICAgICAgICAgICAgICAgIC8vIE1vZGlmaWVyc1xyXG4gICAgICAgICAgICAgICAgaWYgKGsgPT0gJ2N0cmwnIHx8IGsgPT0gJ2NvbnRyb2wnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5jdHJsLndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsgPT0gJ3NoaWZ0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuc2hpZnQud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoayA9PSAnYWx0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuYWx0LndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsgPT0gJ21ldGEnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5tZXRhLndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsubGVuZ3RoID4gMSkgeyAvLyBJZiBpdCBpcyBhIHNwZWNpYWwga2V5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3BlY2lhbF9rZXlzW2tdID09IGNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9uLktleWNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb24uS2V5Y29kZSA9PSBjb2RlKSBrcCsrO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gVGhlIHNwZWNpYWwga2V5cyBkaWQgbm90IG1hdGNoXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJhY3RlciA9PSBrKSBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zaGlmdF9udW1zW2NoYXJhY3Rlcl0gJiYgZS5zaGlmdEtleSkgeyAvLyBTdHVwaWQgU2hpZnQga2V5IGJ1ZyBjcmVhdGVkIGJ5IHVzaW5nIGxvd2VyY2FzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhcmFjdGVyID0gdGhpcy5zaGlmdF9udW1zW2NoYXJhY3Rlcl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhcmFjdGVyID09IGspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoa3AgPT0ga2V5cy5sZW5ndGggJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmN0cmwucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5jdHJsLndhbnRlZCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuc2hpZnQucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5zaGlmdC53YW50ZWQgJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmFsdC5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLmFsdC53YW50ZWQgJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLm1ldGEucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5tZXRhLndhbnRlZCkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2soZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9wdGlvbi5Qcm9wYWdhdGUpIHsgLy8gU3RvcCB0aGUgZXZlbnRcclxuICAgICAgICAgICAgICAgICAgICAvLyBlLmNhbmNlbEJ1YmJsZSBpcyBzdXBwb3J0ZWQgYnkgSUUgLSB0aGlzIHdpbGwga2lsbCB0aGUgYnViYmxpbmcgcHJvY2Vzcy5cclxuICAgICAgICAgICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBlLnN0b3BQcm9wYWdhdGlvbiB3b3JrcyBpbiBGaXJlZm94LlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuY3RybC5wcmVzc2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLnNoaWZ0LnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuYWx0LnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMubWV0YS5wcmVzc2VkID0gZmFsc2U7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQge1xyXG4gICAgS2V5Ym9hcmRTaG9ydGN1dCxcclxuICAgIFNob3J0Y3V0T3B0aW9uLFxyXG4gICAgS2V5Ym9hcmRFdmVudFxyXG59IGZyb20gXCIuL0tleWJvYXJkU2hvcnRjdXRcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUtleWJvYXJkU2hvcnRjdXRzIHtcclxuICAgIFtrZXk6IHN0cmluZ106IEtleWJvYXJkU2hvcnRjdXRcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlIHtcclxuICAgIGFkZChzaG9yY3V0TmFtZTogc3RyaW5nLCBjYWxsYmFjazogKCkgPT4gdm9pZCwgb3B0aW9uczogU2hvcnRjdXRPcHRpb24pOiB2b2lkO1xyXG4gICAgcmVtb3ZlKHNob3JjdXROYW1lOiBzdHJpbmcpOiB2b2lkO1xyXG5cclxuICAgIHNob3JjdXRzOiBJS2V5Ym9hcmRTaG9ydGN1dHNcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzUmVnaXN0ZXJQcm92aWRlciBleHRlbmRzIG5nLklTZXJ2aWNlUHJvdmlkZXIge1xyXG4gICAgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZSBpbXBsZW1lbnRzIElTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2Uge1xyXG4gICAgcHJpdmF0ZSBfbG9nOiBuZy5JTG9nU2VydmljZTtcclxuICAgIHByaXZhdGUgX2RlZmF1bHRPcHRpb246IFNob3J0Y3V0T3B0aW9uO1xyXG4gICAgcHJpdmF0ZSBfc2hvcnRjdXRzOiBJS2V5Ym9hcmRTaG9ydGN1dHM7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgIG9wdGlvbjogU2hvcnRjdXRPcHRpb25cclxuICAgICkge1xyXG4gICAgICAgIFwibmdJbmplY3RcIjtcclxuICAgICAgICB0aGlzLl9sb2cgPSAkbG9nO1xyXG4gICAgICAgIHRoaXMuX2RlZmF1bHRPcHRpb24gPSBvcHRpb24gPyBfLmRlZmF1bHRzKG9wdGlvbiwgdGhpcy5nZXREZWZhdWx0T3B0aW9uKCkpIDogdGhpcy5nZXREZWZhdWx0T3B0aW9uKCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3Nob3J0Y3V0cyA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0RGVmYXVsdE9wdGlvbigpOiBTaG9ydGN1dE9wdGlvbiB7XHJcbiAgICAgICAgbGV0IGRlZmF1bHRPcHRpb246IFNob3J0Y3V0T3B0aW9uID0ge1xyXG4gICAgICAgICAgICBUeXBlOiBLZXlib2FyZEV2ZW50LktleWRvd24sXHJcbiAgICAgICAgICAgIFByb3BhZ2F0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgIERpc2FibGVJbklucHV0OiBmYWxzZSxcclxuICAgICAgICAgICAgVGFyZ2V0OiBkb2N1bWVudCxcclxuICAgICAgICAgICAgS2V5Y29kZTogbnVsbFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBkZWZhdWx0T3B0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2hlY2tBZGRTaG9ydGN1dChlbGVtZW50OiBhbnksIHNob3JjdXRDb21iaW5hdGlvbjogc3RyaW5nLCBjYWxsYmFjazogKGU6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB2b2lkKTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKCFlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvZy5lcnJvcignUmVnaXN0ZXIgc2hvcnRjdXQ6IGVsZW1lbnQgdW5kZW50aWZpZWQhJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXNob3JjdXRDb21iaW5hdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1JlZ2lzdGVyIHNob3J0Y3V0OiBzaG9yY3V0IGNvbWJpbmF0aW9uIHVuZGVudGlmaWVkIScpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFjYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1JlZ2lzdGVyIHNob3J0Y3V0OiBzaG9yY3V0IGNhbGxiYWNrIHVuZGVudGlmaWVkIScpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBzaG9yY3V0cygpOiBJS2V5Ym9hcmRTaG9ydGN1dHMge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFkZChzaG9yY3V0TmFtZTogc3RyaW5nLCBjYWxsYmFjazogKGU6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB2b2lkLCBvcHRpb246IFNob3J0Y3V0T3B0aW9uKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5yZW1vdmUoc2hvcmN1dE5hbWUpO1xyXG4gICAgICAgIGxldCBzaG9yY3V0T3B0aW9uOiBTaG9ydGN1dE9wdGlvbiA9IG9wdGlvbiA/IF8uZGVmYXVsdHMob3B0aW9uLCB0aGlzLl9kZWZhdWx0T3B0aW9uKSA6IHRoaXMuX2RlZmF1bHRPcHRpb247XHJcbiAgICAgICAgbGV0IHNob3JjdXRDb21iaW5hdGlvbjogc3RyaW5nID0gc2hvcmN1dE5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICBsZXQgZWxlbWVudCA9IHNob3JjdXRPcHRpb24uVGFyZ2V0O1xyXG5cclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBzaG9yY3V0T3B0aW9uLlRhcmdldCA9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2hvcmN1dE9wdGlvbi5UYXJnZXQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBzaG9yY3V0T3B0aW9uLlRhcmdldDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jaGVja0FkZFNob3J0Y3V0KGVsZW1lbnQsIHNob3JjdXRDb21iaW5hdGlvbiwgY2FsbGJhY2spKSB7XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBuZXdLZXlib2FyZFNob3J0Y3V0ID0gbmV3IEtleWJvYXJkU2hvcnRjdXQoZWxlbWVudCwgc2hvcmN1dENvbWJpbmF0aW9uLCBzaG9yY3V0T3B0aW9uLCBjYWxsYmFjayk7XHJcblxyXG4gICAgICAgIHRoaXMuX3Nob3J0Y3V0c1tzaG9yY3V0Q29tYmluYXRpb25dID0gbmV3S2V5Ym9hcmRTaG9ydGN1dDtcclxuXHJcbiAgICAgICAgLy9BdHRhY2ggdGhlIGZ1bmN0aW9uIHdpdGggdGhlIGV2ZW50XHJcbiAgICAgICAgaWYgKGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcikge1xyXG4gICAgICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoc2hvcmN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYXR0YWNoRXZlbnQpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5hdHRhY2hFdmVudCgnb24nICsgc2hvcmN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2spO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQub24oc2hvcmN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgcmVtb3ZlKHNob3JjdXROYW1lOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICBsZXQgc2hvcnRjdXRDb21iaW5hdGlvbiA9IHNob3JjdXROYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgbGV0IGJpbmRpbmc6IEtleWJvYXJkU2hvcnRjdXQgPSB0aGlzLl9zaG9ydGN1dHNbc2hvcnRjdXRDb21iaW5hdGlvbl07XHJcblxyXG4gICAgICAgIGRlbGV0ZSh0aGlzLl9zaG9ydGN1dHNbc2hvcnRjdXRDb21iaW5hdGlvbl0pXHJcbiAgICAgICAgaWYgKCFiaW5kaW5nKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCB0eXBlID0gYmluZGluZy5ldmVudDtcclxuICAgICAgICBsZXQgZWxlbWVudCA9IGJpbmRpbmcudGFyZ2V0O1xyXG4gICAgICAgIGxldCBjYWxsYmFjayA9IGJpbmRpbmcuZXZlbnRDYWxsYmFjaztcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQuZGV0YWNoRXZlbnQpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5kZXRhY2hFdmVudCgnb24nICsgdHlwZSwgY2FsbGJhY2spO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgZmFsc2UpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGVsZW1lbnRbJ29uJyArIHR5cGVdID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGVsZW1lbnQub2ZmKHR5cGUsIGNhbGxiYWNrKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbntcclxuICAgIGNsYXNzIFNob3J0Y3V0c1JlZ2lzdGVyUHJvdmlkZXIgaW1wbGVtZW50cyBJU2hvcnRjdXRzUmVnaXN0ZXJQcm92aWRlciB7XHJcbiAgICAgICAgcHJpdmF0ZSBfc2VydmljZTogU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlO1xyXG4gICAgICAgIHByaXZhdGUgX29wdGlvbjogU2hvcnRjdXRPcHRpb247XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXQgb3B0aW9uKCk6IFNob3J0Y3V0T3B0aW9uIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXQgb3B0aW9uKHZhbHVlOiBTaG9ydGN1dE9wdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLl9vcHRpb24gPSB2YWx1ZSB8fCBuZXcgU2hvcnRjdXRPcHRpb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyAkZ2V0KFxyXG4gICAgICAgICAgICAkbG9nOiBuZy5JTG9nU2VydmljZVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fc2VydmljZSA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fc2VydmljZSA9IG5ldyBTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2UoJGxvZywgdGhpcy5fb3B0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zZXJ2aWNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZSgncGlwU2hvcnRjdXRzJylcclxuICAgICAgICAucHJvdmlkZXIoJ3BpcFNob3J0Y3V0c1JlZ2lzdGVyJywgU2hvcnRjdXRzUmVnaXN0ZXJQcm92aWRlcik7XHJcbn0iLCJpbXBvcnQgIHtcclxuICAgIFNob3J0Y3V0T3B0aW9uLFxyXG59IGZyb20gXCIuL0tleWJvYXJkU2hvcnRjdXRcIjtcclxuXHJcbmltcG9ydCAge1xyXG4gICAgSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZSxcclxufSBmcm9tIFwiLi9TaG9yY3V0c1JlZ2lzdGVyU2VydmljZVwiO1xyXG5cclxuaW50ZXJmYWNlIFNob3J0Y3V0QXR0cmlidXRlcyBleHRlbmRzIG5nLklBdHRyaWJ1dGVzIHtcclxuICAgIHBpcFNob3J0Y3V0QWN0aW9uOiBhbnk7XHJcbiAgICBwaXBTaG9ydGN1dE5hbWU6IGFueTtcclxuICAgIHBpcFNob3JjdXRPcHRpb25zOiBTaG9ydGN1dE9wdGlvbjtcclxufVxyXG5cclxuY2xhc3MgU2hvcnRjdXRDb250cm9sbGVyIGltcGxlbWVudHMgbmcuSUNvbnRyb2xsZXIgIHtcclxuICAgIHByaXZhdGUgYWN0aW9uU2hvcnRjdXRzOiBGdW5jdGlvbjtcclxuICAgIHByaXZhdGUgbmFtZVNob3J0Y3V0czogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBvcHRpb25zOiBTaG9ydGN1dE9wdGlvbjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICRhdHRyczogU2hvcnRjdXRBdHRyaWJ1dGVzLFxyXG4gICAgICAgICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICBwaXBTaG9ydGN1dHNSZWdpc3RlcjogSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZVxyXG4gICAgKSB7XHJcbiAgICAgICAgXCJuZ0luamVjdFwiO1xyXG5cclxuICAgICAgICBpZiAoJGF0dHJzLnBpcFNob3J0Y3V0QWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzID0gJHBhcnNlKCRhdHRycy5waXBTaG9ydGN1dEFjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzKCRzY29wZSwgeyRldmVudDoge319KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAkbG9nLmVycm9yKCdTaG9yY3VudCBhY3Rpb24gZG9lcyBub3Qgc2V0LicpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoJGF0dHJzLnBpcFNob3J0Y3V0TmFtZSAmJiBfLmlzU3RyaW5nKCRhdHRycy5waXBTaG9ydGN1dE5hbWUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZVNob3J0Y3V0cyA9ICRhdHRycy5waXBTaG9ydGN1dE5hbWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgJGxvZy5lcnJvcignU2hvcmN1bnQgbmFtZSBkb2VzIG5vdCBzZXQuJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMub3B0aW9ucyA9ICRhdHRycy5waXBTaG9yY3V0T3B0aW9ucyA/IDxTaG9ydGN1dE9wdGlvbj4kYXR0cnMucGlwU2hvcmN1dE9wdGlvbnMgOiA8U2hvcnRjdXRPcHRpb24+e307XHJcbiAgICAgICAgdGhpcy5vcHRpb25zLlRhcmdldCA9ICRlbGVtZW50O1xyXG4gICAgICAgIC8vIFJlZ2lzdHJhdGlvbiBvZiBrZXlib3JkIHNob3J0Y3V0c1xyXG4gICAgICAgIHBpcFNob3J0Y3V0c1JlZ2lzdGVyLmFkZCh0aGlzLm5hbWVTaG9ydGN1dHMsIChlPzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzKCRzY29wZSwgeyRldmVudDogeydlJzogZX19KTsgICAgICAgICAgXHJcbiAgICAgICAgfSwgdGhpcy5vcHRpb25zKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGtleXByZXNzU2hvcnRjdXQoYWN0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMoKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gUHJldmVudCBqdW5rIGZyb20gZ29pbmcgaW50byB0eXBlc2NyaXB0IGRlZmluaXRpb25zXHJcbntcclxuICAgIGNvbnN0IHNob3J0Y3V0c0RpcmVjdGl2ZSA9IGZ1bmN0aW9uKCk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSwgICAgICAgICAgICBcclxuICAgICAgICAgICAgY29udHJvbGxlcjogU2hvcnRjdXRDb250cm9sbGVyXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZSgncGlwU2hvcnRjdXRzJylcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBTaG9ydGN1dCcsIHNob3J0Y3V0c0RpcmVjdGl2ZSk7XHJcbn0iLCJpbXBvcnQge1xyXG4gICAgSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZVxyXG59IGZyb20gXCIuL1Nob3JjdXRzUmVnaXN0ZXJTZXJ2aWNlXCJcclxuaW1wb3J0ICB7XHJcbiAgICBLZXlib2FyZFNob3J0Y3V0LFxyXG4gICAgU2hvcnRjdXRPcHRpb24sXHJcbiAgICBLZXlib2FyZEV2ZW50XHJcbn0gZnJvbSBcIi4vS2V5Ym9hcmRTaG9ydGN1dFwiO1xyXG5cclxuZXhwb3J0IGxldCBTaG9ydGN1dHNDaGFuZ2VkRXZlbnQgPSAncGlwU2hvcnRjdXRzQ2hhbmdlZCc7XHJcblxyXG5leHBvcnQgY2xhc3MgU2hvcnRjdXRJdGVtIHtcclxuICAgIC8vIFNob3J0Y3V0IGNvbWJpbmF0aW9uXHJcbiAgICBwdWJsaWMgc2hvcnRjdXQ6IHN0cmluZztcclxuICAgIC8vIFRhcmdldCBvYmplY3QgXHJcbiAgICBwdWJsaWMgdGFyZ2V0PzogYW55O1xyXG4gICAgLy8gVGFyZ2V0IGVsZW1lbnQgYnkgSWRcclxuICAgIHB1YmxpYyB0YXJnZXRJZD86IHN0cmluZztcclxuICAgIC8vIFRhcmdldCBlbGVtZW50IGJ5IGNsYXNzIChmaXJzdGVsZW1lbnQ/PylcclxuICAgIC8vIFB1YmxpYyB0YXJnZXRDbGFzcz86IHN0cmluZztcclxuICAgIC8vIEFjY2VzcyBmdW5jdGlvblxyXG4gICAgcHVibGljIGFjY2Vzcz86IChldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IGJvb2xlYW47XHJcbiAgICAvLyBXaW5kb3cubG9jYXRpb24uaHJlZlxyXG4gICAgcHVibGljIGhyZWY/OiBzdHJpbmc7XHJcbiAgICAvLyAkbG9jYXRpb24udXJsXHJcbiAgICBwdWJsaWMgdXJsPzogc3RyaW5nO1xyXG4gICAgLy8gJHN0YXRlLmdvKHN0YXRlLCBzdGF0ZVBhcmFtcylcclxuICAgIHB1YmxpYyBzdGF0ZT86IHN0cmluZztcclxuICAgIC8vIFBhcmFtZXRlcnMgZm9yICRzdGF0ZS5nbyhzdGF0ZSwgc3RhdGVQYXJhbXMpXHJcbiAgICBwdWJsaWMgc3RhdGVQYXJhbXM/OiBhbnk7XHJcbiAgICAvLyAkcm9vdFNjb3BlLmJyb2FkY2FzdChldmVudClcclxuICAgIHB1YmxpYyBldmVudD86IHN0cmluZztcclxuICAgIC8vIENsaWNrIGNhbGxiYWNrXHJcbiAgICBwdWJsaWMga2V5cHJlc3M/OiAoZXZlbnQ6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB2b2lkO1xyXG4gICAgLy8gRGVmYXVsdCBvcHRpb25zXHJcbiAgICBwdWJsaWMgb3B0aW9ucz86IFNob3J0Y3V0T3B0aW9uOyAgICBcclxufVxyXG5cclxuLy8gZXhwb3J0IGNsYXNzIFNob3J0Y3V0SXRlbSBleHRlbmRzIFNpbXBsZVNob3J0Y3V0SXRlbSB7XHJcbi8vICAgICBwdWJsaWMgc2hvcnRjdXRzOiBTaW1wbGVTaG9ydGN1dEl0ZW1bXTtcclxuLy8gfVxyXG5cclxuZXhwb3J0IGNsYXNzIFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAvLyBHbG9iYWwgc2hvcnRjdXQgXHJcbiAgICBwdWJsaWMgZ2xvYmFsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXSA9IFtdO1xyXG4gICAgLy8gTG9jYWwgc2hvcnRjdXQgXHJcbiAgICBwdWJsaWMgbG9jYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdID0gW107XHJcbiAgICAvLyBEZWZhdWx0IG9wdGlvbnNcclxuICAgIHB1YmxpYyBkZWZhdWx0T3B0aW9uczogU2hvcnRjdXRPcHRpb24gPSBudWxsO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElTaG9ydGN1dHNTZXJ2aWNlIHtcclxuICAgIHJlYWRvbmx5IGNvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG5cclxuICAgIGdsb2JhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW107XHJcbiAgICBsb2NhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW107XHJcblxyXG4gICAgb24oZ2xvYmFsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10sIGxvY2FsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10pOiB2b2lkO1xyXG4gICAgb25Mb2NhbChsb2NhbFNob3J0Y3V0cz86IFNob3J0Y3V0SXRlbVtdKTogdm9pZDtcclxuICAgIG9mZigpOiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElTaG9ydGN1dHNQcm92aWRlciBleHRlbmRzIG5nLklTZXJ2aWNlUHJvdmlkZXIge1xyXG4gICAgY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcbiAgICBcclxuICAgIGdsb2JhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW107XHJcbiAgICBsb2NhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW107XHJcbiAgICBkZWZhdWx0T3B0aW9uczogU2hvcnRjdXRPcHRpb247XHJcbn1cclxuXHJcbmNsYXNzIFNob3J0Y3V0c1NlcnZpY2UgaW1wbGVtZW50cyBJU2hvcnRjdXRzU2VydmljZSB7XHJcbiAgICBwcml2YXRlIF9vbGRDb25maWc6IFNob3J0Y3V0c0NvbmZpZztcclxuICAgIHByaXZhdGUgX2NvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICBjb25maWc6IFNob3J0Y3V0c0NvbmZpZyxcclxuICAgICAgICBwcml2YXRlICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIFxyXG4gICAgICAgIHByaXZhdGUgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLCBcclxuICAgICAgICBwcml2YXRlICRpbmplY3RvcjogbmcuYXV0by5JSW5qZWN0b3JTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgcGlwU2hvcnRjdXRzUmVnaXN0ZXI6IElTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2VcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHRoaXMuY29uZmlnO1xyXG4gICAgICAgIHRoaXMuX29sZENvbmZpZyA9IF8uY2xvbmVEZWVwKHRoaXMuY29uZmlnKTtcclxuXHJcbiAgICAgICAgLy8gQWRkIHNob3J0Y3V0c1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuY29uZmlnLmdsb2JhbFNob3J0Y3V0cyk7XHJcbiAgICAgICAgdGhpcy5hZGRTaG9ydGN1dHModGhpcy5jb25maWcubG9jYWxTaG9ydGN1dHMpOyAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVzY3JpYmUgcHJpdmF0ZSBmdW5jdGlvbnNcclxuICAgIHByaXZhdGUgc2VuZENoYW5nZUV2ZW50KCkge1xyXG4gICAgICAgIC8vIFJlbW92ZSBzaG9ydGN1dHNcclxuICAgICAgICB0aGlzLnJlbW92ZVNob3J0Y3V0cyh0aGlzLl9vbGRDb25maWcuZ2xvYmFsU2hvcnRjdXRzKTtcclxuICAgICAgICB0aGlzLnJlbW92ZVNob3J0Y3V0cyh0aGlzLl9vbGRDb25maWcubG9jYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIC8vIEFkZCBzaG9ydGN1dHNcclxuICAgICAgICB0aGlzLmFkZFNob3J0Y3V0cyh0aGlzLmNvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuY29uZmlnLmxvY2FsU2hvcnRjdXRzKTtcclxuXHJcbiAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRlbWl0KFNob3J0Y3V0c0NoYW5nZWRFdmVudCwgdGhpcy5jb25maWcpO1xyXG4gICAgICAgIC8vIFNhdmUgY3VycmVudCBjb25maWcgdG8gb2xkQ29uZmlnXHJcbiAgICAgICAgdGhpcy5fb2xkQ29uZmlnID0gXy5jbG9uZURlZXAodGhpcy5jb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVtb3ZlU2hvcnRjdXRzKGNvbGxlY3Rpb246IFNob3J0Y3V0SXRlbVtdKTogdm9pZCB7XHJcbiAgICAgICAgXy5lYWNoKGNvbGxlY3Rpb24sIChrKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGlwU2hvcnRjdXRzUmVnaXN0ZXIucmVtb3ZlKGsuc2hvcnRjdXQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUga2V5cHJlc3NTaG9ydGN1dChzaG9yY3V0OiBTaG9ydGN1dEl0ZW0sIGV2ZW50OiBKUXVlcnlFdmVudE9iamVjdCkge1xyXG4gICAgICAgIGlmIChzaG9yY3V0LmFjY2VzcyAmJiBfLmlzRnVuY3Rpb24oc2hvcmN1dC5hY2Nlc3MpKSB7XHJcbiAgICAgICAgICAgIGlmICghc2hvcmN1dC5hY2Nlc3MoZXZlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IFxyXG5cclxuICAgICAgICBpZiAoc2hvcmN1dC5rZXlwcmVzcykge1xyXG4gICAgICAgICAgICBzaG9yY3V0LmtleXByZXNzKGV2ZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNob3JjdXQuaHJlZikge1xyXG4gICAgICAgICAgICB0aGlzLiR3aW5kb3cubG9jYXRpb24uaHJlZiA9IHNob3JjdXQuaHJlZjtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNob3JjdXQudXJsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGxvY2F0aW9uLnVybChzaG9yY3V0LnVybCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzaG9yY3V0LnN0YXRlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiRpbmplY3Rvci5oYXMoJyRzdGF0ZScpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgJHN0YXRlID0gdGhpcy4kaW5qZWN0b3IuZ2V0KCckc3RhdGUnKTtcclxuICAgICAgICAgICAgICAgICRzdGF0ZVsnZ28nXShzaG9yY3V0LnN0YXRlLCBzaG9yY3V0LnN0YXRlUGFyYW1zKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2hvcmN1dC5ldmVudCkge1xyXG4gICAgICAgICAgICB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdChzaG9yY3V0LmV2ZW50KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgcmFpc2Ugbm90aWZpY2F0aW9uXHJcbiAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdwaXBTaG9ydGN1dEtleXByZXNzJywgc2hvcmN1dC5zaG9ydGN1dCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYWRkU2hvcnRjdXRzKGNvbGxlY3Rpb246IFNob3J0Y3V0SXRlbVtdKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IGdlbmVyYWxPcHRpb25zOiBTaG9ydGN1dE9wdGlvbiA9IHRoaXMuY29uZmlnLmRlZmF1bHRPcHRpb25zID8gdGhpcy5jb25maWcuZGVmYXVsdE9wdGlvbnMgOiA8U2hvcnRjdXRPcHRpb24+e307XHJcbiAgICAgICAgXHJcbiAgICAgICAgXy5lYWNoKGNvbGxlY3Rpb24sIChrKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBvcHRpb246IFNob3J0Y3V0T3B0aW9uID0gay5vcHRpb25zID8gay5vcHRpb25zIDogZ2VuZXJhbE9wdGlvbnM7XHJcbiAgICAgICAgICAgIGxldCB0YXJnZXQ6IGFueTtcclxuXHJcbiAgICAgICAgICAgIHRhcmdldCA9IGsudGFyZ2V0ID8gay50YXJnZXQgOiBrLnRhcmdldElkO1xyXG4gICAgICAgICAgICBvcHRpb24uVGFyZ2V0ID0gdGFyZ2V0O1xyXG4gICAgICAgICAgICAvLyBSZWdpc3RyYXRpb24gb2Yga2V5Ym9hcmQgc2hvcnRjdXRcclxuICAgICAgICAgICAgdGhpcy5waXBTaG9ydGN1dHNSZWdpc3Rlci5hZGQoay5zaG9ydGN1dCwgKGU/OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMua2V5cHJlc3NTaG9ydGN1dChrLCBlKTsgICAgICAgIFxyXG4gICAgICAgICAgICB9LCBvcHRpb24pOyAgICAgICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVzY3JpYmUgcHVibGljIGZ1bmN0aW9ucyBcclxuICAgIHB1YmxpYyBnZXQgY29uZmlnKCk6IFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGRlZmF1bHRPcHRpb25zKCk6IFNob3J0Y3V0T3B0aW9uIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmRlZmF1bHRPcHRpb25zO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgZGVmYXVsdE9wdGlvbnModmFsdWU6IFNob3J0Y3V0T3B0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmRlZmF1bHRPcHRpb25zID0gdmFsdWUgfHwgbnVsbDtcclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZ2xvYmFsU2hvcnRjdXRzKCk6IFNob3J0Y3V0SXRlbVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGdsb2JhbFNob3J0Y3V0cyh2YWx1ZTogU2hvcnRjdXRJdGVtW10pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gdmFsdWUgfHwgW107XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGxvY2FsU2hvcnRjdXRzKCk6IFNob3J0Y3V0SXRlbVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgbG9jYWxTaG9ydGN1dHModmFsdWU6IFNob3J0Y3V0SXRlbVtdKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzID0gdmFsdWUgfHwgW107XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgb24oZ2xvYmFsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10sIGxvY2FsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10pOiB2b2lkIHtcclxuICAgICAgICBpZiAoZ2xvYmFsU2hvcnRjdXRzICYmIF8uaXNBcnJheShnbG9iYWxTaG9ydGN1dHMpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMgPSBnbG9iYWxTaG9ydGN1dHM7ICAgIFxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobG9jYWxTaG9ydGN1dHMgJiYgXy5pc0FycmF5KGxvY2FsU2hvcnRjdXRzKSkge1xyXG4gICAgICAgICAgICB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHMgPSBsb2NhbFNob3J0Y3V0czsgICAgXHJcbiAgICAgICAgfSAgICAgICAgXHJcblxyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9uTG9jYWwobG9jYWxTaG9ydGN1dHM/OiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQge1xyXG4gICAgICAgIGlmIChsb2NhbFNob3J0Y3V0cyAmJiBfLmlzQXJyYXkobG9jYWxTaG9ydGN1dHMpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyA9IGxvY2FsU2hvcnRjdXRzOyAgICBcclxuICAgICAgICB9ICAgICAgICBcclxuXHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgb2ZmKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMgPSBbXTtcclxuICAgICAgICB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHMgPSBbXTtcclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTaG9ydGN1dHNQcm92aWRlciBpbXBsZW1lbnRzIElTaG9ydGN1dHNQcm92aWRlciB7XHJcbiAgICBwcml2YXRlIF9jb25maWc6IFNob3J0Y3V0c0NvbmZpZyA9IG5ldyBTaG9ydGN1dHNDb25maWcoKTtcclxuICAgIHByaXZhdGUgX3NlcnZpY2U6IFNob3J0Y3V0c1NlcnZpY2U7XHJcblxyXG4gICAgcHVibGljIGdldCBjb25maWcoKTogU2hvcnRjdXRzQ29uZmlnIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgY29uZmlnKHZhbHVlOiBTaG9ydGN1dHNDb25maWcpIHtcclxuICAgICAgICB0aGlzLl9jb25maWcgPSB2YWx1ZSB8fCBuZXcgU2hvcnRjdXRzQ29uZmlnKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBkZWZhdWx0T3B0aW9ucygpOiBTaG9ydGN1dE9wdGlvbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5kZWZhdWx0T3B0aW9ucztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGRlZmF1bHRPcHRpb25zKHZhbHVlOiBTaG9ydGN1dE9wdGlvbikge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5kZWZhdWx0T3B0aW9ucyA9IHZhbHVlIHx8IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBnbG9iYWxTaG9ydGN1dHMoKTogU2hvcnRjdXRJdGVtW10ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgZ2xvYmFsU2hvcnRjdXRzKHZhbHVlOiBTaG9ydGN1dEl0ZW1bXSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMgPSB2YWx1ZSB8fCBbXTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGxvY2FsU2hvcnRjdXRzKCk6IFNob3J0Y3V0SXRlbVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgbG9jYWxTaG9ydGN1dHModmFsdWU6IFNob3J0Y3V0SXRlbVtdKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzID0gdmFsdWUgfHwgW107XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljICRnZXQoXHJcbiAgICAgICAgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UsIFxyXG4gICAgICAgICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLCBcclxuICAgICAgICAkbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2UsIFxyXG4gICAgICAgICRpbmplY3RvcjogbmcuYXV0by5JSW5qZWN0b3JTZXJ2aWNlLFxyXG4gICAgICAgIHBpcFNob3J0Y3V0c1JlZ2lzdGVyOiBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9zZXJ2aWNlID09IG51bGwpXHJcbiAgICAgICAgICAgIHRoaXMuX3NlcnZpY2UgPSBuZXcgU2hvcnRjdXRzU2VydmljZSh0aGlzLl9jb25maWcsICRyb290U2NvcGUsICR3aW5kb3csICRsb2NhdGlvbiwgJGluamVjdG9yLCBwaXBTaG9ydGN1dHNSZWdpc3Rlcik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlcnZpY2U7XHJcbiAgICB9XHJcbn1cclxuXHJcbmFuZ3VsYXJcclxuICAgIC5tb2R1bGUoJ3BpcFNob3J0Y3V0cycpXHJcbiAgICAucHJvdmlkZXIoJ3BpcFNob3J0Y3V0cycsIFNob3J0Y3V0c1Byb3ZpZGVyKTtcclxuXHJcbiIsImFuZ3VsYXIubW9kdWxlKCdwaXBTaG9ydGN1dHMnLCBbJ25nTWF0ZXJpYWwnLCAndWkucm91dGVyJ10pO1xyXG5cclxuaW1wb3J0ICcuL1Nob3JjdXRzUmVnaXN0ZXJTZXJ2aWNlJztcclxuaW1wb3J0ICcuL1Nob3J0Y3V0c1NlcnZpY2UnO1xyXG5pbXBvcnQgJy4vU2hvcnRjdXREaXJlY3RpdmUnO1xyXG5cclxuZXhwb3J0ICogZnJvbSAnLi9TaG9ydGN1dHNTZXJ2aWNlJztcclxuZXhwb3J0ICogZnJvbSAnLi9TaG9yY3V0c1JlZ2lzdGVyU2VydmljZSc7Iiwie1xyXG4gICAgdmFyIHRoaXNNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZShcInBpcFNlbGVjdGVkXCIsIFtdKTtcclxuXHJcbiAgICB0aGlzTW9kdWxlLmRpcmVjdGl2ZSgncGlwU2VsZWN0ZWQnLCBmdW5jdGlvbiAoJHBhcnNlLCAkbWRDb25zdGFudCwgJHRpbWVvdXQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGU6IGFueSwgJGVsZW1lbnQsICRhdHRyczogYW55KSB7XHJcbiAgICAgICAgICAgICAgICB2YXJcclxuICAgICAgICAgICAgICAgICAgICBpbmRleEdldHRlciA9ICRhdHRycy5waXBTZWxlY3RlZCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0ZWQpIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpbmRleFNldHRlciA9IGluZGV4R2V0dGVyID8gaW5kZXhHZXR0ZXIuYXNzaWduIDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpZEdldHRlciA9ICRhdHRycy5waXBTZWxlY3RlZElkID8gJHBhcnNlKCRhdHRycy5waXBTZWxlY3RlZElkKSA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaWRTZXR0ZXIgPSBpZEdldHRlciA/IGlkR2V0dGVyLmFzc2lnbiA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0KSA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgZW50ZXJTcGFjZUdldHRlciA9ICRhdHRycy5waXBFbnRlclNwYWNlUHJlc3MgPyAkcGFyc2UoJGF0dHJzLnBpcEVudGVyU3BhY2VQcmVzcykgOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vU2Nyb2xsID0gJGF0dHJzLnBpcE5vU2Nyb2xsLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vZGlmaWVyID0gJGF0dHJzLnBpcFNraXBIaWRkZW4gPyAnOnZpc2libGUnIDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lID0gJGF0dHJzLnBpcFRyZWVMaXN0ID8gJy5waXAtc2VsZWN0YWJsZS10cmVlJyA6ICcucGlwLXNlbGVjdGFibGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpbmRleEdldHRlcigkc2NvcGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRFbGVtZW50VGFiaW5leCA9ICRlbGVtZW50LmF0dHIoJ3RhYmluZGV4JyksXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwU2VsZWN0ZWRXYXRjaCA9ICRhdHRycy5waXBTZWxlY3RlZFdhdGNoLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzU2Nyb2xsZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB2YXJpYWJsZXMgZm9yIHRvdWNoICAgIFxyXG4gICAgICAgICAgICAgICAgdmFyIHRvdWNoU3RhcnRYLCB0b3VjaFN0YXJ0WSwgdHJhY2tpbmdDbGljaywgdHJhY2tpbmdDbGlja1N0YXJ0LCB0YXJnZXRFbGVtZW50LCBsYXN0Q2xpY2tUaW1lLCBjYW5jZWxOZXh0Q2xpY2s7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zdGFudCBmb3IgdG91Y2hcclxuICAgICAgICAgICAgICAgIHZhciB0b3VjaEJvdW5kYXJ5ID0gMTAsXHJcbiAgICAgICAgICAgICAgICAgICAgdGFwZGVsYXkgPSAyMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgdGFwVGltZW91dCA9IDcwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBTZXQgdGFiaW5kZXggaWYgaXQncyBub3Qgc2V0IHlldFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCBjdXJyZW50RWxlbWVudFRhYmluZXggfHwgMCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ2NsaWNrJywgY2xhc3NOYW1lLCBvbkNsaWNrRXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNoc3RhcnQnLCBjbGFzc05hbWUsIG9uVG91Y2hTdGFydCk7XHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5vbigndG91Y2htb3ZlJywgY2xhc3NOYW1lLCBvblRvdWNoTW92ZSk7XHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5vbigndG91Y2hlbmQnLCBjbGFzc05hbWUsIG9uVG91Y2hFbmQpO1xyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNoY2FuY2VsJywgY2xhc3NOYW1lLCBvblRvdWNoQ2FuY2VsKTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdrZXlkb3duJywgb25LZXlEb3duKTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c2luJywgb25Gb2N1c0luKTtcclxuICAgICAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c291dCcsIG9uRm9jdXNPdXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFdhdGNoIHNlbGVjdGVkIGl0ZW0gaW5kZXhcclxuICAgICAgICAgICAgICAgIGlmICghJGF0dHJzLnBpcFRyZWVMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaChpbmRleEdldHRlciwgZnVuY3Rpb24gKG5ld1NlbGVjdGVkSW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXg6IG5ld1NlbGVjdGVkSW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goaWRHZXR0ZXIsIGZ1bmN0aW9uIChuZXdTZWxlY3RlZElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUlkOiBuZXdTZWxlY3RlZElkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBXYXRjaCByZXN5bmMgc2VsZWN0aW9uXHJcbiAgICAgICAgICAgICAgICBpZiAocGlwU2VsZWN0ZWRXYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2gocGlwU2VsZWN0ZWRXYXRjaCwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEZWxheSB1cGRhdGUgdG8gYWxsb3cgbmctcmVwZWF0IHRvIHVwZGF0ZSBET01cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gaW5kZXhHZXR0ZXIoJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gU2VsZWN0IGl0ZW0gZGVmaW5lZCBieSBpbmRleFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4OiBzZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSlcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIEZ1bmN0aW9ucyBhbmQgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzZWxlY3RJdGVtKGl0ZW1QYXJhbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNTY3JvbGxlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBpdGVtSW5kZXggPSBpdGVtUGFyYW1zLml0ZW1JbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUlkID0gaXRlbVBhcmFtcy5pdGVtSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zID0gaXRlbVBhcmFtcy5pdGVtcyB8fCAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArIG1vZGlmaWVyKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNMZW5ndGggPSBpdGVtcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1QYXJhbXMuaXRlbSkgcmV0dXJuIGl0ZW1QYXJhbXMuaXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtSW5kZXggPT09IHVuZGVmaW5lZCAmJiBpdGVtSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4ID0gaXRlbXMuaW5kZXgoaXRlbXMuZmlsdGVyKCdbcGlwLWlkPScgKyBpdGVtSWQgKyAnXScpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtSW5kZXggPj0gMCAmJiBpdGVtSW5kZXggPCBpdGVtc0xlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtc1tpdGVtSW5kZXhdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0oKSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQgPSBpdGVtUGFyYW1zLnJhaXNlRXZlbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmZpbmQoY2xhc3NOYW1lKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQgbWQtZm9jdXNlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NlbGVjdGVkIG1kLWZvY3VzZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZvY3VzKCk7IC8vIHRvZG8g0YHQtNCy0LjQs9Cw0LXRgiDRgdC/0LjRgdC+0Log0YLRg9GCLCDQvdCwINC/0LXRgNCy0L7QvCDQv9GA0L7RhdC+0LTQtVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW5vU2Nyb2xsKSBzY3JvbGxUb0l0ZW0oaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyYWlzZUV2ZW50KSBkZWZpbmVTZWxlY3RlZEluZGV4KGl0ZW1zKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGRlZmluZVNlbGVjdGVkSW5kZXgoaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkU2VsZWN0ZWRJbmRleCA9IHNlbGVjdGVkSW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBpdGVtcy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCQoaXRlbXNbaW5kZXhdKS5oYXNDbGFzcygnc2VsZWN0ZWQnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRleCA9IGluZGV4O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBFeGVjdXRlIGNhbGxiYWNrIHRvIG5vdGlmeSBhYm91dCBpdGVtIHNlbGVjdFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvbGRTZWxlY3RlZEluZGV4ICE9IHNlbGVjdGVkSW5kZXggJiYgc2VsZWN0ZWRJbmRleCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSh1cGRhdGVJbmRleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShvblNlbGVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGVJbmRleCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkSXRlbSA9IGFuZ3VsYXIuZWxlbWVudChpdGVtc1tzZWxlY3RlZEluZGV4XSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZElkID0gc2VsZWN0ZWRJdGVtLmF0dHIoJ3BpcC1pZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4U2V0dGVyKSBpbmRleFNldHRlcigkc2NvcGUsIHNlbGVjdGVkSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRTZXR0ZXIpIGlkU2V0dGVyKCRzY29wZSwgc2VsZWN0ZWRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uU2VsZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25TZWxlY3QoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZEl0ZW0gPSBhbmd1bGFyLmVsZW1lbnQoaXRlbXNbc2VsZWN0ZWRJbmRleF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJZCA9IHNlbGVjdGVkSXRlbS5hdHRyKCdwaXAtaWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGFuZ2VHZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZUdldHRlcigkc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiAkZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTogc2VsZWN0ZWRJdGVtLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogc2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHNlbGVjdGVkSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0luZGV4OiBzZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJbmRleDogb2xkU2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzY3JvbGxUb0l0ZW0oJGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobm9TY3JvbGwpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcCA9ICRlbGVtZW50Lm9mZnNldCgpLnRvcCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVySGVpZ2h0ID0gJGVsZW1lbnQuaGVpZ2h0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IGNvbnRhaW5lclRvcCArIGNvbnRhaW5lckhlaWdodCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbVRvcCA9ICRpdGVtLm9mZnNldCgpLnRvcCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUhlaWdodCA9ICRpdGVtLm91dGVySGVpZ2h0KHRydWUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtQm90dG9tID0gaXRlbVRvcCArIGl0ZW1IZWlnaHQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbFRvcCA9ICRlbGVtZW50LnNjcm9sbFRvcCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpc1Njcm9sbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNTY3JvbGxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250YWluZXJUb3AgPiBpdGVtVG9wKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LnNjcm9sbFRvcChjb250YWluZXJTY3JvbGxUb3AgKyBpdGVtVG9wIC0gY29udGFpbmVyVG9wKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnRhaW5lckJvdHRvbSA8IGl0ZW1Cb3R0b20pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIGl0ZW1Cb3R0b20gLSBjb250YWluZXJCb3R0b20pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXZlbnRUYXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBPbiBzb21lIG9sZGVyIGJyb3dzZXJzIHRoZSBldmVudCB0YXJnZXQgbWF5IGJlIGEgdGV4dCBub2RlLlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudFRhcmdldC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50VGFyZ2V0LnBhcmVudE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnRUYXJnZXQ7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRvdWNoSGFzTW92ZWQoZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdG91Y2ggPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm91bmRhcnkgPSB0b3VjaEJvdW5kYXJ5OyAvL1RvdWNobW92ZSBib3VuZGFyeSwgYmV5b25kIHdoaWNoIGEgY2xpY2sgd2lsbCBiZSBjYW5jZWxsZWQuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyh0b3VjaC5wYWdlWCAtIHRvdWNoU3RhcnRYKSA+IGJvdW5kYXJ5IHx8IE1hdGguYWJzKHRvdWNoLnBhZ2VZIC0gdG91Y2hTdGFydFkpID4gYm91bmRhcnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uQ2xpY2tFdmVudChldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtOiBldmVudC5jdXJyZW50VGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25Ub3VjaFN0YXJ0KGV2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9ldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBldi5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudFsndGFyZ2V0VG91Y2hlcyddLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0YXJnZXRFbGVtZW50ID0gZ2V0VGFyZ2V0RWxlbWVudEZyb21FdmVudFRhcmdldChldmVudC50YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0b3VjaCA9IGV2ZW50Wyd0YXJnZXRUb3VjaGVzJ11bMF07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRyYWNraW5nQ2xpY2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYWNraW5nQ2xpY2tTdGFydCA9IGV2ZW50LnRpbWVTdGFtcDtcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRFbGVtZW50ID0gdGFyZ2V0RWxlbWVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdG91Y2hTdGFydFggPSB0b3VjaC5wYWdlWDtcclxuICAgICAgICAgICAgICAgICAgICB0b3VjaFN0YXJ0WSA9IHRvdWNoLnBhZ2VZO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoKGV2ZW50LnRpbWVTdGFtcCAtIGxhc3RDbGlja1RpbWUpIDwgdGFwZGVsYXkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvblRvdWNoTW92ZShldikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdHJhY2tpbmdDbGljaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV2ZW50ID0gZXYub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgdG91Y2ggaGFzIG1vdmVkLCBjYW5jZWwgdGhlIGNsaWNrIHRyYWNraW5nXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldEVsZW1lbnQgIT09IGdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXZlbnQudGFyZ2V0KSB8fCB0b3VjaEhhc01vdmVkKGV2ZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFja2luZ0NsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEVsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25Ub3VjaEVuZChldikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmb3JFbGVtZW50LCBuZXdUcmFja2luZ0NsaWNrU3RhcnQsIHRhcmdldFRhZ05hbWUsIHNjcm9sbFBhcmVudCwgdG91Y2gsIG5ld3RhcmdldEVsZW1lbnQgPSB0YXJnZXRFbGVtZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRyYWNraW5nQ2xpY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50ID0gZXYub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgICAgICAgICAvLyBQcmV2ZW50IHBoYW50b20gY2xpY2tzIG9uIGZhc3QgZG91YmxlLXRhcCBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKGV2ZW50LnRpbWVTdGFtcCAtIGxhc3RDbGlja1RpbWUpIDwgdGFwZGVsYXkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsTmV4dENsaWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoKGV2ZW50LnRpbWVTdGFtcCAtIHRyYWNraW5nQ2xpY2tTdGFydCkgPiB0YXBUaW1lb3V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzZXQgdG8gcHJldmVudCB3cm9uZyBjbGljayBjYW5jZWwgb24gaW5wdXQgXHJcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsTmV4dENsaWNrID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxhc3RDbGlja1RpbWUgPSBldmVudC50aW1lU3RhbXA7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1RyYWNraW5nQ2xpY2tTdGFydCA9IHRyYWNraW5nQ2xpY2tTdGFydDtcclxuICAgICAgICAgICAgICAgICAgICB0cmFja2luZ0NsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhY2tpbmdDbGlja1N0YXJ0ID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IGV2LmN1cnJlbnRUYXJnZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9uVG91Y2hDYW5jZWwoZXYpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmFja2luZ0NsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gb25LZXlEb3duKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5Q29kZSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBjb250cm9sIGtleUNvZGVcclxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5FTlRFUiB8fCBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlNQQUNFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRlclNwYWNlR2V0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRlclNwYWNlR2V0dGVyKCRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6ICRlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogc2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTogJGVsZW1lbnQuZmluZCgnLnNlbGVjdGVkJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5MRUZUX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5Q29kZSA9PSAkbWRDb25zdGFudC5LRVlfQ09ERS5VUF9BUlJPVyB8fCBrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1cpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCBuZXh0IHNlbGVjdGFibGUgY29udHJvbCBpbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbXMgPSAkZWxlbWVudC5maW5kKGNsYXNzTmFtZSArIG1vZGlmaWVyKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluYyA9IChrZXlDb2RlID09ICRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8IGtleUNvZGUgPT0gJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykgPyAxIDogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdTZWxlY3RlZEluZGV4ID0gc2VsZWN0ZWRJbmRleCArIGluYztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBuZXh0IGNvbnRyb2wgYXMgc2VsZWN0ZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXg6IG5ld1NlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogaXRlbXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkZvY3VzSW4oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBDaG9vc2Ugc2VsZWN0ZWQgZWxlbWVudFxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBpdGVtcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtID0gJGVsZW1lbnQuZmluZChjbGFzc05hbWUgKyAnLnNlbGVjdGVkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbS5hZGRDbGFzcygnbWQtZm9jdXNlZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbm90IHNlbGVjdGVkIGVsZW1lbnRzIHRoZW4gcGljayB0aGUgZmlyc3Qgb25lXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkSXRlbS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJbmRleCA9IGluZGV4R2V0dGVyKCRzY29wZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zID0gJGVsZW1lbnQuZmluZChjbGFzc05hbWUgKyBtb2RpZmllcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4OiBzZWxlY3RlZEluZGV4IHx8IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogaXRlbXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbkZvY3VzT3V0KGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuZmluZChjbGFzc05hbWUgKyAnLm1kLWZvY3VzZWQnICsgbW9kaWZpZXIpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XHJcbntcclxuICAgIGludGVyZmFjZSBVbnNhdmVkQ2hhbmdlc1Njb3BlIGV4dGVuZHMgbmcuSVNjb3BlIHtcclxuICAgICAgICB1bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZTogRnVuY3Rpb247XHJcbiAgICAgICAgdW5zYXZlZENoYW5nZXNNZXNzYWdlOiBzdHJpbmc7XHJcbiAgICAgICAgY2FuY2VsTGVhdmU6IEZ1bmN0aW9uO1xyXG4gICAgICAgIGFmdGVyTGVhdmU6IEZ1bmN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIFVuc2F2ZWRDaGFuZ2VzTGluayB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgICRzY29wZTogVW5zYXZlZENoYW5nZXNTY29wZSxcclxuICAgICAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgJHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUudW5zYXZlZENoYW5nZXNBdmFpbGFibGUoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdW5iaW5kRnVuYyA9ICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlKCkgJiYgISR3aW5kb3cuY29uZmlybSgkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbigkc2NvcGUuY2FuY2VsTGVhdmUpICYmICRzY29wZS5jYW5jZWxMZWF2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbigkc2NvcGUuYWZ0ZXJMZWF2ZSkgJiYgJHNjb3BlLmFmdGVyTGVhdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICR3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdW5iaW5kRnVuYygpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgVW5zYXZlZENoYW5nZXMgPSBmdW5jdGlvbiAoJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0FFJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlJyxcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzTWVzc2FnZTogJ0BwaXBVbnNhdmVkQ2hhbmdlc01lc3NhZ2UnLFxyXG4gICAgICAgICAgICAgICAgYWZ0ZXJMZWF2ZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0FmdGVyTGVhdmUnLFxyXG4gICAgICAgICAgICAgICAgY2FuY2VsTGVhdmU6ICcmcGlwVW5zYXZlZENoYW5nZXNDYW5jZWxMZWF2ZSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZTogVW5zYXZlZENoYW5nZXNTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgbmV3IFVuc2F2ZWRDaGFuZ2VzTGluaygkc2NvcGUsICR3aW5kb3cpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZShcInBpcFVuc2F2ZWRDaGFuZ2VzXCIsIFtdKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoXCJwaXBVbnNhdmVkQ2hhbmdlc1wiLCBVbnNhdmVkQ2hhbmdlcyk7XHJcbn0iXX0=