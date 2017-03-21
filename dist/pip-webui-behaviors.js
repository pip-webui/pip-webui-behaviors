(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.pip || (g.pip = {})).behaviors = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
{
    var CancelDragLink_1 = (function () {
        function CancelDragLink_1($element) {
            $element.find('*').attr('pip-cancel-drag', 'pip-cancel-drag');
        }
        return CancelDragLink_1;
    }());
    var CancelDrag = function () {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attrs) {
                new CancelDragLink_1($element);
            }
        };
    };
    angular.module("pipDraggable")
        .directive('pipCancelDrag', CancelDrag);
}
},{}],2:[function(require,module,exports){
"use strict";
{
    var DragLink_1 = (function () {
        function DragLink_1($rootScope, $parse, $document, $window, pipDraggable, $scope, $element, $attrs) {
            this.$rootScope = $rootScope;
            this.$parse = $parse;
            this.$document = $document;
            this.$window = $window;
            this.pipDraggable = pipDraggable;
            this.$scope = $scope;
            this.$element = $element;
            this.$attrs = $attrs;
            this.LONG_PRESS = 50;
            this._centerAnchor = false;
            this._hasTouch = ('ontouchstart' in window) || window.DocumentTouch;
            this._pressEvents = 'touchstart mousedown';
            this._moveEvents = 'touchmove mousemove';
            this._releaseEvents = 'touchend mouseup';
            this._data = null;
            this._dragOffset = null;
            this._dragEnabled = false;
            this._pressTimer = null;
            this._elementStyle = {};
            this.scrollParent = false;
            this.scrollContainer = angular.element(window);
            this._deregisterRootMoveListener = angular.noop;
            $scope.value = $attrs.ngDrag;
            this._myid = $scope.$id;
            this.onDragStartCallback = $parse($attrs.pipDragStart) || null;
            this.onDragStopCallback = $parse($attrs.pipDragStop) || null;
            this.onDragSuccessCallback = $parse($attrs.pipDragSuccess) || null;
            this.allowTransform = angular.isDefined($attrs.allowTransform) ? $scope.$eval($attrs.allowTransform) : false;
            this.getDragData = $parse($attrs.pipDragData);
            this.verticalScroll = $attrs.pipVerticalScroll || true;
            this.horizontalScroll = $attrs.pipHorizontalScroll || true;
            this.activationDistance = parseFloat($attrs.pipActivationDistance) || 75;
            this.scrollDistance = parseFloat($attrs.pipActivationDistance) || 50;
            this.scrollContainerGetter = $parse($attrs.pipScrollContainer);
            this.$element.css('cursor', 'move');
            this.initialize();
        }
        DragLink_1.prototype.initialize = function () {
            this.$element.attr('pip-draggable', 'false');
            var dragHandles;
            if (this.$element[0].querySelectorAll) {
                dragHandles = angular.element(this.$element[0].querySelectorAll('[pip-drag-handle]'));
            }
            else {
                dragHandles = this.$element.find('[pip-drag-handle]');
            }
            if (dragHandles.length) {
                this._dragHandle = dragHandles;
            }
            this.toggleListeners(true);
            if (this.scrollParent) {
                this.scrollContainer = angular.element(this.$element.parent());
            }
            else if (this.$attrs.pipScrollContainer) {
                this.scrollContainer = angular.element(this.scrollContainerGetter(this.$scope));
            }
            else {
                this.scrollContainer = angular.element(window);
            }
        };
        DragLink_1.prototype.toggleListeners = function (enable) {
            var _this = this;
            if (!enable)
                return;
            this.$scope.$on('$destroy', function () {
                _this.onDestroy(enable);
            });
            this.$scope.$watch(this.$attrs.pipDrag, function (newVal, oldVal) {
                _this.onEnableChange(newVal, oldVal);
            });
            this.$scope.$watch(this.$attrs.pipCenterAnchor, function (newVal, oldVal) {
                _this.onCenterAnchor(newVal, oldVal);
            });
            if (this._dragHandle) {
                this._dragHandle.on(this._pressEvents, function (event) {
                    _this.onpress(event);
                });
            }
            else {
                this.$element.on(this._pressEvents, function (event) {
                    _this.onpress(event);
                });
            }
            if (!this._hasTouch && this.$element[0].nodeName.toLowerCase() == "img") {
                this.$element.on('mousedown', function () {
                    return false;
                });
            }
        };
        DragLink_1.prototype.onDestroy = function (enable) {
            this.toggleListeners(false);
        };
        DragLink_1.prototype.onEnableChange = function (newVal, oldVal) {
            this._dragEnabled = (newVal);
        };
        DragLink_1.prototype.onCenterAnchor = function (newVal, oldVal) {
            if (angular.isDefined(newVal))
                this._centerAnchor = (newVal || 'true');
        };
        DragLink_1.prototype.isClickableElement = function (evt) {
            return (angular.isDefined(angular.element(evt.target).attr("pip-cancel-drag")));
        };
        DragLink_1.prototype.onpress = function (evt) {
            var _this = this;
            if (!this._dragEnabled)
                return;
            if (this.isClickableElement(evt)) {
                return;
            }
            if (evt.type == "mousedown" && evt.button != 0) {
                return;
            }
            this.saveElementStyles();
            if (this._hasTouch) {
                this.cancelPress();
                this._pressTimer = setTimeout(function () {
                    _this.cancelPress();
                    _this.onlongpress(evt);
                }, this.LONG_PRESS);
                this.$document.on(this._moveEvents, function () {
                    _this.cancelPress();
                });
                this.$document.on(this._releaseEvents, function () {
                    _this.cancelPress();
                });
            }
            else {
                this.onlongpress(evt);
            }
        };
        DragLink_1.prototype.saveElementStyles = function () {
            this._elementStyle.left = this.$element.css('css') || 0;
            this._elementStyle.top = this.$element.css('top') || 0;
            this._elementStyle.position = this.$element.css('position');
            this._elementStyle.width = this.$element.css('width');
        };
        DragLink_1.prototype.cancelPress = function () {
            var _this = this;
            clearTimeout(this._pressTimer);
            this.$document.off(this._moveEvents, function () {
                _this.cancelPress();
            });
            this.$document.off(this._releaseEvents, function () {
                _this.cancelPress();
            });
        };
        DragLink_1.prototype.onlongpress = function (evt) {
            var _this = this;
            if (!this._dragEnabled)
                return;
            evt.preventDefault();
            this.offset = this.$element[0].getBoundingClientRect();
            if (this.allowTransform)
                this._dragOffset = this.offset;
            else {
                this._dragOffset = {
                    left: document.body.scrollLeft,
                    top: document.body.scrollTop
                };
            }
            this.$element.centerX = this.$element[0].offsetWidth / 2;
            this.$element.centerY = this.$element[0].offsetHeight / 2;
            this._mx = this.pipDraggable.inputEvent(evt).pageX;
            this._my = this.pipDraggable.inputEvent(evt).pageY;
            this._mrx = this._mx - this.offset.left;
            this._mry = this._my - this.offset.top;
            if (this._centerAnchor) {
                this._tx = this._mx - this.$element.centerX - this.$window.pageXOffset;
                this._ty = this._my - this.$element.centerY - this.$window.pageYOffset;
            }
            else {
                this._tx = this._mx - this._mrx - this.$window.pageXOffset;
                this._ty = this._my - this._mry - this.$window.pageYOffset;
            }
            this.$document.on(this._moveEvents, function (event) {
                _this.onmove(event);
            });
            this.$document.on(this._releaseEvents, function (event) {
                _this.onrelease(event);
            });
            this._deregisterRootMoveListener = this.$rootScope.$on('draggable:_triggerHandlerMove', function (event, origEvent) {
                _this.onmove(origEvent);
            });
        };
        DragLink_1.prototype.onmove = function (evt) {
            var _this = this;
            if (!this._dragEnabled)
                return;
            evt.preventDefault();
            if (!this.$element.hasClass('pip-dragging')) {
                this._data = this.getDragData(this.$scope);
                this.$element.addClass('pip-dragging');
                this.$rootScope.$broadcast('draggable:start', {
                    x: this._mx,
                    y: this._my,
                    tx: this._tx,
                    ty: this._ty,
                    event: evt,
                    element: this.$element,
                    data: this._data
                });
                if (this.onDragStartCallback) {
                    this.$scope.$apply(function () {
                        _this.onDragStartCallback(_this.$scope, {
                            $data: _this._data,
                            $event: evt
                        });
                    });
                }
            }
            this._mx = this.pipDraggable.inputEvent(evt).pageX;
            this._my = this.pipDraggable.inputEvent(evt).pageY;
            if (this.horizontalScroll || this.verticalScroll) {
                this.dragToScroll();
            }
            if (this._centerAnchor) {
                this._tx = this._mx - this.$element.centerX - this._dragOffset.left;
                this._ty = this._my - this.$element.centerY - this._dragOffset.top;
            }
            else {
                this._tx = this._mx - this._mrx - this._dragOffset.left;
                this._ty = this._my - this._mry - this._dragOffset.top;
            }
            this.moveElement(this._tx, this._ty);
            this.$rootScope.$broadcast('draggable:move', {
                x: this._mx,
                y: this._my,
                tx: this._tx,
                ty: this._ty,
                event: evt,
                element: this.$element,
                data: this._data,
                uid: this._myid,
                dragOffset: this._dragOffset
            });
        };
        DragLink_1.prototype.onrelease = function (evt) {
            var _this = this;
            if (!this._dragEnabled)
                return;
            evt.preventDefault();
            this.$rootScope.$broadcast('draggable:end', {
                x: this._mx,
                y: this._my,
                tx: this._tx,
                ty: this._ty,
                event: evt,
                element: this.$element,
                data: this._data,
                callback: this.onDragComplete,
                uid: this._myid
            });
            this.$element.removeClass('pip-dragging');
            this.$element.parent().find('.pip-drag-enter').removeClass('pip-drag-enter');
            this.reset();
            this.$document.off(this._moveEvents);
            this.$document.off(this._releaseEvents);
            if (this.onDragStopCallback) {
                this.$scope.$apply(function () {
                    _this.onDragStopCallback(_this.$scope, {
                        $data: _this._data,
                        $event: evt
                    });
                });
            }
            this._deregisterRootMoveListener();
        };
        DragLink_1.prototype.onDragComplete = function (evt) {
            var _this = this;
            if (!this.onDragSuccessCallback)
                return;
            this.$scope.$apply(function () {
                _this.onDragSuccessCallback(_this.$scope, {
                    $data: _this._data,
                    $event: evt
                });
            });
        };
        DragLink_1.prototype.reset = function () {
            if (this.allowTransform)
                this.$element.css({
                    transform: '',
                    'z-index': '',
                    '-webkit-transform': '',
                    '-ms-transform': ''
                });
            else {
                this.$element.css({
                    position: this._elementStyle.position,
                    top: this._elementStyle.top,
                    left: this._elementStyle.left,
                    'z-index': '',
                    width: this._elementStyle.width
                });
            }
        };
        DragLink_1.prototype.moveElement = function (x, y) {
            var eWidth = this.$element.css('width');
            if (this.allowTransform) {
                this.$element.css({
                    transform: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ' + x + ', ' + y + ', 0, 1)',
                    'z-index': 99999,
                    '-webkit-transform': 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ' + x + ', ' + y + ', 0, 1)',
                    '-ms-transform': 'matrix(1, 0, 0, 1, ' + x + ', ' + y + ')'
                });
            }
            else {
                this.$element.css({
                    'left': x + 'px',
                    'top': y + 'px',
                    'position': 'fixed',
                    'z-index': 100,
                    width: eWidth
                });
            }
        };
        DragLink_1.prototype.dragToScroll = function () {
            var scrollX = 0, scrollY = 0, offset = function (element) {
                return element.offset() || {
                    left: 0,
                    top: 0
                };
            };
            if (this.horizontalScroll) {
                var containerLeft = offset(this.scrollContainer).left, containerWidth = this.scrollContainer.innerWidth(), containerRight = containerLeft + containerWidth;
                if ((this._mx - containerLeft) < this.activationDistance) {
                    scrollX = -this.scrollDistance;
                }
                else if ((containerRight - this._mx) < this.activationDistance) {
                    scrollX = this.scrollDistance;
                }
            }
            if (this.verticalScroll) {
                var containerTop = offset(this.scrollContainer).top, containerHeight = this.scrollContainer.innerHeight(), containerBottom = containerTop + containerHeight;
                if ((this._my - containerTop) < this.activationDistance) {
                    scrollY = -this.scrollDistance + 30;
                }
                else if ((containerBottom - this._my) < this.activationDistance) {
                    scrollY = this.scrollDistance - 30;
                }
            }
            if (scrollX !== 0 || scrollY !== 0) {
                var containerScrollLeft = this.scrollContainer.scrollLeft(), containerScrollTop = this.scrollContainer.scrollTop();
                this.scrollContainer.scrollLeft(containerScrollLeft + scrollX);
                this.scrollContainer.scrollTop(containerScrollTop + scrollY);
            }
        };
        return DragLink_1;
    }());
    var Drag = function ($rootScope, $parse, $document, $window, pipDraggable) {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attrs) {
                new DragLink_1($rootScope, $parse, $document, $window, pipDraggable, $scope, $element, $attrs);
            }
        };
    };
    Drag.$inject = ['$rootScope', '$parse', '$document', '$window', 'pipDraggable'];
    angular.module("pipDraggable")
        .directive('pipDrag', Drag);
}
},{}],3:[function(require,module,exports){
"use strict";
{
    var DraggableService = (function () {
        function DraggableService() {
        }
        DraggableService.prototype.inputEvent = function (event) {
            if (angular.isDefined(event.touches)) {
                return event.touches[0];
            }
            else if (angular.isDefined(event.originalEvent) && angular.isDefined(event.originalEvent.touches)) {
                return event.originalEvent.touches[0];
            }
            return event;
        };
        ;
        return DraggableService;
    }());
    angular.module("pipDraggable")
        .service('pipDraggable', DraggableService);
}
},{}],4:[function(require,module,exports){
"use strict";
{
    var DropLink_1 = (function () {
        function DropLink_1($parse, $document, $timeout, pipDraggable, $scope, $element, $attrs) {
            this.$parse = $parse;
            this.$document = $document;
            this.$timeout = $timeout;
            this.pipDraggable = pipDraggable;
            this.$scope = $scope;
            this.$element = $element;
            this.$attrs = $attrs;
            $scope.value = $attrs.pipDrop;
            $scope.isTouching = false;
            this._myid = $scope.$id;
            this.onDropCallback = $parse($attrs.pipDropSuccess);
            this.onDragStartCallback = $parse($attrs.pipDragStart);
            this.onDragStopCallback = $parse($attrs.pipDragStop);
            this.onDragMoveCallback = $parse($attrs.pipDragMove);
            this.initialize();
        }
        DropLink_1.prototype.initialize = function () {
            this.toggleListeners(true);
        };
        DropLink_1.prototype.toggleListeners = function (enable) {
            var _this = this;
            if (!enable)
                return;
            this.$scope.$watch(this.$attrs.pipDrop, function (newVal, oldVal) {
                _this.onEnableChange(newVal, oldVal);
            });
            this.$scope.$on('$destroy', function (event) {
                _this.onDestroy(event);
            });
            this.$scope.$on('draggable:start', function (evt, obj) {
                _this.onDragStart(evt, obj);
            });
            this.$scope.$on('draggable:move', function (evt, obj) {
                _this.onDragMove(evt, obj);
            });
            this.$scope.$on('draggable:end', function (evt, obj) {
                _this.onDragEnd(evt, obj);
            });
        };
        DropLink_1.prototype.onDestroy = function (enable) {
            this.toggleListeners(false);
        };
        DropLink_1.prototype.onEnableChange = function (newVal, oldVal) {
            this._dropEnabled = newVal;
        };
        DropLink_1.prototype.onDragStart = function (evt, obj) {
            var _this = this;
            if (!this._dropEnabled)
                return;
            this.isTouching(obj.x, obj.y, obj.element);
            if (this.$attrs.pipDragStart) {
                this.$timeout(function () {
                    _this.onDragStartCallback(_this.$scope, {
                        $data: obj.data,
                        $event: obj
                    });
                });
            }
        };
        DropLink_1.prototype.onDragMove = function (evt, obj) {
            var _this = this;
            if (!this._dropEnabled)
                return;
            this.isTouching(obj.x, obj.y, obj.element);
            if (this.$attrs.pipDragMove) {
                this.$timeout(function () {
                    _this.onDragMoveCallback(_this.$scope, {
                        $data: obj.data,
                        $event: obj
                    });
                });
            }
        };
        DropLink_1.prototype.onDragEnd = function (evt, obj) {
            var _this = this;
            if (!this._dropEnabled || this._myid === obj.uid) {
                this.updateDragStyles(false, obj.element);
                return;
            }
            if (this.isTouching(obj.x, obj.y, obj.element)) {
                if (obj.callback) {
                    obj.callback(obj);
                }
                if (this.$attrs.pipDropSuccess) {
                    this.$timeout(function () {
                        _this.onDropCallback(_this.$scope, {
                            $data: obj.data,
                            $event: obj,
                            $target: _this.$scope.$eval(_this.$scope.value)
                        });
                    });
                }
            }
            if (this.$attrs.pipDragStop) {
                this.$timeout(function () {
                    _this.onDragStopCallback(_this.$scope, {
                        $data: obj.data,
                        $event: obj
                    });
                });
            }
            this.updateDragStyles(false, obj.element);
        };
        DropLink_1.prototype.isTouching = function (mouseX, mouseY, dragElement) {
            var touching = this.hitTest(mouseX, mouseY);
            this.$scope.isTouching = touching;
            if (touching) {
                this._lastDropTouch = this.$element;
            }
            this.updateDragStyles(touching, dragElement);
            return touching;
        };
        DropLink_1.prototype.updateDragStyles = function (touching, dragElement) {
            if (touching) {
                this.$element.addClass('pip-drag-enter');
                dragElement.addClass('pip-drag-over');
            }
            else if (this._lastDropTouch == this.$element) {
                this._lastDropTouch = null;
                this.$element.removeClass('pip-drag-enter');
                dragElement.removeClass('pip-drag-over');
            }
        };
        ;
        DropLink_1.prototype.hitTest = function (x, y) {
            var bounds = this.$element[0].getBoundingClientRect();
            x -= this.$document[0].body.scrollLeft + this.$document[0].documentElement.scrollLeft;
            y -= this.$document[0].body.scrollTop + this.$document[0].documentElement.scrollTop;
            return x >= bounds.left &&
                x <= bounds.right &&
                y <= bounds.bottom &&
                y >= bounds.top;
        };
        return DropLink_1;
    }());
    var Drop = function ($parse, $document, $timeout, pipDraggable) {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attrs) {
                new DropLink_1($parse, $document, $timeout, pipDraggable, $scope, $element, $attrs);
            }
        };
    };
    Drop.$inject = ['$parse', '$document', '$timeout', 'pipDraggable'];
    angular.module("pipDraggable")
        .directive('pipDrop', Drop);
}
},{}],5:[function(require,module,exports){
{
    var PreventDragLink_1 = (function () {
        function PreventDragLink_1($element) {
            this.$element = $element;
            this.initialize();
        }
        PreventDragLink_1.prototype.initialize = function () {
            this.$element.attr('pip-draggable', 'false');
            this.toggleListeners(true);
        };
        PreventDragLink_1.prototype.toggleListeners = function (enable) {
            var _this = this;
            if (!enable)
                return;
            this.$element.on('mousedown touchstart touchmove touchend touchcancel', function (event) { _this.absorbEvent_(event); });
        };
        PreventDragLink_1.prototype.absorbEvent_ = function (event) {
            var e = event.originalEvent;
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            e.cancelBubble = true;
            e.returnValue = false;
            return false;
        };
        return PreventDragLink_1;
    }());
    var PreventDrag = function () {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attrs) {
                new PreventDragLink_1($element);
            }
        };
    };
    angular.module("pipDraggable")
        .directive('pipPreventDrag', PreventDrag);
}
},{}],6:[function(require,module,exports){
"use strict";
angular.module("pipDraggable", []);
require("./DraggableService");
require("./Drag");
require("./Drop");
require("./PreventDrag");
require("./CancelDrag");
},{"./CancelDrag":1,"./Drag":2,"./DraggableService":3,"./Drop":4,"./PreventDrag":5}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
require("./unsaved_changes/UnsavedChanges");
require("./keyboard_shortcuts");
require("./focused/Focused");
require("./draggable");
require("./selected/Selected");
require("./focused/Focused");
require("./infinite_scroll/InfiniteScroll");
angular.module('pipBehaviors', [
    'pipFocused',
    'pipSelected',
    'pipInfiniteScroll',
    'pipUnsavedChanges',
    'pipDraggable',
    'pipShortcuts'
]);
__export(require("./keyboard_shortcuts"));
},{"./draggable":6,"./focused/Focused":7,"./infinite_scroll/InfiniteScroll":9,"./keyboard_shortcuts":14,"./selected/Selected":15,"./unsaved_changes/UnsavedChanges":16}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
},{"./KeyboardShortcut":10}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
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
        this._config = config;
        this._oldConfig = _.cloneDeep(this._config);
        this.addShortcuts(this._config.globalShortcuts);
        this.addShortcuts(this._config.localShortcuts);
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
        console.log('this._config', this._config);
        if (this._service == null)
            this._service = new ShortcutsService(this._config, $rootScope, $window, $location, $injector, pipShortcutsRegister);
        return this._service;
    }];
    return ShortcutsProvider;
}());
angular
    .module('pipShortcuts')
    .provider('pipShortcuts', ShortcutsProvider);
},{}],14:[function(require,module,exports){
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
},{"./ShorcutsRegisterService":11,"./ShortcutDirective":12,"./ShortcutsService":13}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
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
},{}]},{},[8])(8)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZHJhZ2dhYmxlL0NhbmNlbERyYWcudHMiLCJzcmMvZHJhZ2dhYmxlL0RyYWcudHMiLCJzcmMvZHJhZ2dhYmxlL0RyYWdnYWJsZVNlcnZpY2UudHMiLCJzcmMvZHJhZ2dhYmxlL0Ryb3AudHMiLCJzcmMvZHJhZ2dhYmxlL1ByZXZlbnREcmFnLnRzIiwic3JjL2RyYWdnYWJsZS9pbmRleC50cyIsInNyYy9mb2N1c2VkL0ZvY3VzZWQudHMiLCJzcmMvaW5kZXgudHMiLCJzcmMvaW5maW5pdGVfc2Nyb2xsL0luZmluaXRlU2Nyb2xsLnRzIiwic3JjL2tleWJvYXJkX3Nob3J0Y3V0cy9LZXlib2FyZFNob3J0Y3V0LnRzIiwic3JjL2tleWJvYXJkX3Nob3J0Y3V0cy9TaG9yY3V0c1JlZ2lzdGVyU2VydmljZS50cyIsInNyYy9rZXlib2FyZF9zaG9ydGN1dHMvU2hvcnRjdXREaXJlY3RpdmUudHMiLCJzcmMva2V5Ym9hcmRfc2hvcnRjdXRzL1Nob3J0Y3V0c1NlcnZpY2UudHMiLCJzcmMva2V5Ym9hcmRfc2hvcnRjdXRzL2luZGV4LnRzIiwic3JjL3NlbGVjdGVkL1NlbGVjdGVkLnRzIiwic3JjL3Vuc2F2ZWRfY2hhbmdlcy9VbnNhdmVkQ2hhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLENBQUM7SUFDRztRQUNJLDBCQUNJLFFBQWdCO1lBRWhCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNMLHVCQUFDO0lBQUQsQ0FOQSxBQU1DLElBQUE7SUFFRCxJQUFNLFVBQVUsR0FBRztRQUNmLE1BQU0sQ0FBQztZQUNILFFBQVEsRUFBRSxHQUFHO1lBQ2IsSUFBSSxFQUFFLFVBQ0YsTUFBaUIsRUFDakIsUUFBZ0IsRUFDaEIsTUFBc0I7Z0JBRXRC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QUFDO1lBRUgsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUU7Z0JBQ25CLE9BQU8sQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO2dCQUM5QixVQUFVLEVBQUUsQ0FBQztZQUNqQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFDTCwyQkFBQztJQUFELENBekJBLEFBeUJDLElBQUE7SUFFRCxJQUFNLGNBQWMsR0FBRyxVQUFVLE9BQTBCO1FBQ3ZELE1BQU0sQ0FBQztZQUNILFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFO2dCQUNILHVCQUF1QixFQUFFLDZCQUE2QjtnQkFDdEQscUJBQXFCLEVBQUUsMkJBQTJCO2dCQUNsRCxVQUFVLEVBQUUsOEJBQThCO2dCQUMxQyxXQUFXLEVBQUUsK0JBQStCO2FBQy9DO1lBQ0QsSUFBSSxFQUFFLFVBQVUsTUFBMkI7Z0JBQ3ZDLElBQUksb0JBQWtCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLENBQUM7U0FDSixDQUFDO0lBQ04sQ0FBQyxDQUFBO0lBRUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7U0FDbEMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwie1xyXG4gICAgY2xhc3MgQ2FuY2VsRHJhZ0xpbmsge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICRlbGVtZW50LmZpbmQoJyonKS5hdHRyKCdwaXAtY2FuY2VsLWRyYWcnLCAncGlwLWNhbmNlbC1kcmFnJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IENhbmNlbERyYWcgPSBmdW5jdGlvbiAoKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAgICAgJGF0dHJzOiBuZy5JQXR0cmlidXRlc1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIG5ldyBDYW5jZWxEcmFnTGluaygkZWxlbWVudCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIilcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBDYW5jZWxEcmFnJywgQ2FuY2VsRHJhZyk7XHJcbn0iLCJpbXBvcnQge1xyXG4gICAgSURyYWdnYWJsZVNlcnZpY2VcclxufSBmcm9tICcuL0lEcmFnZ2FibGVTZXJ2aWNlJztcclxuXHJcbntcclxuICAgIGludGVyZmFjZSBJRHJhZ0xpbmtTY29wZSBleHRlbmRzIG5nLklTY29wZSB7XHJcbiAgICAgICAgdmFsdWU6IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgSURyYWdMaW5rQXR0cmlidXRlcyBleHRlbmRzIG5nLklBdHRyaWJ1dGVzIHtcclxuICAgICAgICBuZ0RyYWc6IGFueTtcclxuICAgICAgICBwaXBEcmFnU3RhcnQ6IGFueTtcclxuICAgICAgICBwaXBEcmFnU3RvcDogYW55O1xyXG4gICAgICAgIHBpcERyYWdTdWNjZXNzOiBhbnk7XHJcbiAgICAgICAgYWxsb3dUcmFuc2Zvcm06IGFueTtcclxuICAgICAgICBwaXBEcmFnRGF0YTogYW55O1xyXG4gICAgICAgIHBpcFZlcnRpY2FsU2Nyb2xsOiBhbnk7XHJcbiAgICAgICAgcGlwSG9yaXpvbnRhbFNjcm9sbDogYW55O1xyXG4gICAgICAgIHBpcEFjdGl2YXRpb25EaXN0YW5jZTogYW55O1xyXG4gICAgICAgIHBpcFNjcm9sbENvbnRhaW5lcjogYW55O1xyXG4gICAgICAgIHBpcERyYWc6IGFueTtcclxuICAgICAgICBwaXBDZW50ZXJBbmNob3I6IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBEcmFnTGluayB7XHJcbiAgICAgICAgcHJpdmF0ZSBMT05HX1BSRVNTOiBudW1iZXIgPSA1MDsgLy8gNTBtcyBmb3IgbG9uZ3ByZXNzXHJcbiAgICAgICAgcHJpdmF0ZSBvZmZzZXQ6IGFueTtcclxuICAgICAgICBwcml2YXRlIF9jZW50ZXJBbmNob3I6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBwcml2YXRlIF9teDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX215OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBfdHg6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIF90eTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX21yeDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX21yeTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX2hhc1RvdWNoOiBib29sZWFuID0gKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdykgfHwgKCA8IGFueSA+IHdpbmRvdykuRG9jdW1lbnRUb3VjaDsgLy8gJiYgZG9jdW1lbnQgaW5zdGFuY2VvZiBEb2N1bWVudFRvdWNoOyAvLyBEb2N1bWVudFRvdWNoIGlzIG5vdCBkZWZpbmVkIVxyXG4gICAgICAgIHByaXZhdGUgX3ByZXNzRXZlbnRzOiBzdHJpbmcgPSAndG91Y2hzdGFydCBtb3VzZWRvd24nO1xyXG4gICAgICAgIHByaXZhdGUgX21vdmVFdmVudHM6IHN0cmluZyA9ICd0b3VjaG1vdmUgbW91c2Vtb3ZlJztcclxuICAgICAgICBwcml2YXRlIF9yZWxlYXNlRXZlbnRzOiBzdHJpbmcgPSAndG91Y2hlbmQgbW91c2V1cCc7XHJcbiAgICAgICAgcHJpdmF0ZSBfZHJhZ0hhbmRsZTogYW55O1xyXG5cclxuICAgICAgICAvLyB0byBpZGVudGlmeSB0aGUgZWxlbWVudCBpbiBvcmRlciB0byBwcmV2ZW50IGdldHRpbmcgc3VwZXJmbG91cyBldmVudHMgd2hlbiBhIHNpbmdsZSBlbGVtZW50IGhhcyBib3RoIGRyYWcgYW5kIGRyb3AgZGlyZWN0aXZlcyBvbiBpdC5cclxuICAgICAgICBwcml2YXRlIF9teWlkOiBzdHJpbmcgfCBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBfZGF0YTogYW55ID0gbnVsbDtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfZHJhZ09mZnNldDogYW55ID0gbnVsbDtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfZHJhZ0VuYWJsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfcHJlc3NUaW1lcjogYW55ID0gbnVsbDtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfZWxlbWVudFN0eWxlOiBhbnkgPSB7fTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdTdGFydENhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgICAgICBwcml2YXRlIG9uRHJhZ1N0b3BDYWxsYmFjazogRnVuY3Rpb247XHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdTdWNjZXNzQ2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHByaXZhdGUgYWxsb3dUcmFuc2Zvcm06IGJvb2xlYW47XHJcblxyXG4gICAgICAgIHByaXZhdGUgZ2V0RHJhZ0RhdGE6IGFueTtcclxuICAgICAgICBwcml2YXRlIHZlcnRpY2FsU2Nyb2xsOiBib29sZWFuO1xyXG4gICAgICAgIHByaXZhdGUgaG9yaXpvbnRhbFNjcm9sbDogYm9vbGVhbjtcclxuICAgICAgICBwcml2YXRlIGFjdGl2YXRpb25EaXN0YW5jZTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgc2Nyb2xsRGlzdGFuY2U6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIHNjcm9sbFBhcmVudDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBwcml2YXRlIHNjcm9sbENvbnRhaW5lcjogSlF1ZXJ5ID0gYW5ndWxhci5lbGVtZW50KHdpbmRvdyk7XHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxDb250YWluZXJHZXR0ZXI6IGFueTtcclxuXHJcbiAgICAgICAgLy8gZGVyZWdpc3RyYXRpb24gZnVuY3Rpb24gZm9yIG1vdXNlIG1vdmUgZXZlbnRzIGluICRyb290U2NvcGUgdHJpZ2dlcmVkIGJ5IGpxTGl0ZSB0cmlnZ2VyIGhhbmRsZXJcclxuICAgICAgICBwcml2YXRlIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lcjogRnVuY3Rpb24gPSBhbmd1bGFyLm5vb3A7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZG9jdW1lbnQ6IG5nLklEb2N1bWVudFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgcGlwRHJhZ2dhYmxlOiBJRHJhZ2dhYmxlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IElEcmFnTGlua1Njb3BlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGF0dHJzOiBJRHJhZ0xpbmtBdHRyaWJ1dGVzXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICRzY29wZS52YWx1ZSA9ICRhdHRycy5uZ0RyYWc7XHJcbiAgICAgICAgICAgIHRoaXMuX215aWQgPSAkc2NvcGUuJGlkO1xyXG4gICAgICAgICAgICB0aGlzLm9uRHJhZ1N0YXJ0Q2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdTdGFydCkgfHwgbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5vbkRyYWdTdG9wQ2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdTdG9wKSB8fCBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLm9uRHJhZ1N1Y2Nlc3NDYWxsYmFjayA9ICRwYXJzZSgkYXR0cnMucGlwRHJhZ1N1Y2Nlc3MpIHx8IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuYWxsb3dUcmFuc2Zvcm0gPSBhbmd1bGFyLmlzRGVmaW5lZCgkYXR0cnMuYWxsb3dUcmFuc2Zvcm0pID8gJHNjb3BlLiRldmFsKCRhdHRycy5hbGxvd1RyYW5zZm9ybSkgOiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0RHJhZ0RhdGEgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdEYXRhKTtcclxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNhbFNjcm9sbCA9ICRhdHRycy5waXBWZXJ0aWNhbFNjcm9sbCB8fCB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmhvcml6b250YWxTY3JvbGwgPSAkYXR0cnMucGlwSG9yaXpvbnRhbFNjcm9sbCB8fCB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRpb25EaXN0YW5jZSA9IHBhcnNlRmxvYXQoJGF0dHJzLnBpcEFjdGl2YXRpb25EaXN0YW5jZSkgfHwgNzU7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsRGlzdGFuY2UgPSBwYXJzZUZsb2F0KCRhdHRycy5waXBBY3RpdmF0aW9uRGlzdGFuY2UpIHx8IDUwO1xyXG4gICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lckdldHRlciA9ICRwYXJzZSgkYXR0cnMucGlwU2Nyb2xsQ29udGFpbmVyKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKCdjdXJzb3InLCAnbW92ZScpO1xyXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7IC8vIHByZXZlbnQgbmF0aXZlIGRyYWdcclxuICAgICAgICAgICAgLy8gY2hlY2sgdG8gc2VlIGlmIGRyYWcgaGFuZGxlKHMpIHdhcyBzcGVjaWZpZWRcclxuICAgICAgICAgICAgLy8gaWYgcXVlcnlTZWxlY3RvckFsbCBpcyBhdmFpbGFibGUsIHdlIHVzZSB0aGlzIGluc3RlYWQgb2YgZmluZFxyXG4gICAgICAgICAgICAvLyBhcyBKUUxpdGUgZmluZCBpcyBsaW1pdGVkIHRvIHRhZ25hbWVzXHJcbiAgICAgICAgICAgIGxldCBkcmFnSGFuZGxlczogYW55O1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yQWxsKSB7XHJcbiAgICAgICAgICAgICAgICBkcmFnSGFuZGxlcyA9IGFuZ3VsYXIuZWxlbWVudCh0aGlzLiRlbGVtZW50WzBdLnF1ZXJ5U2VsZWN0b3JBbGwoJ1twaXAtZHJhZy1oYW5kbGVdJykpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZHJhZ0hhbmRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1twaXAtZHJhZy1oYW5kbGVdJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRyYWdIYW5kbGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZHJhZ0hhbmRsZSA9IGRyYWdIYW5kbGVzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMudG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY3JvbGwgY29udGFpbmVyXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbFBhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQodGhpcy4kZWxlbWVudC5wYXJlbnQoKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy4kYXR0cnMucGlwU2Nyb2xsQ29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudCh0aGlzLnNjcm9sbENvbnRhaW5lckdldHRlcih0aGlzLiRzY29wZSkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQod2luZG93KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgIGlmICghZW5hYmxlKSByZXR1cm47XHJcbiAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcblxyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJyRkZXN0cm95JywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkRlc3Ryb3koZW5hYmxlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiR3YXRjaCh0aGlzLiRhdHRycy5waXBEcmFnLCAobmV3VmFsLCBvbGRWYWwpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJHdhdGNoKHRoaXMuJGF0dHJzLnBpcENlbnRlckFuY2hvciwgKG5ld1ZhbCwgb2xkVmFsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2VudGVyQW5jaG9yKG5ld1ZhbCwgb2xkVmFsKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIHdpcmUgdXAgdG91Y2ggZXZlbnRzXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9kcmFnSGFuZGxlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBoYW5kbGUocykgc3BlY2lmaWVkLCB1c2UgdGhvc2UgdG8gaW5pdGlhdGUgZHJhZ1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZHJhZ0hhbmRsZS5vbih0aGlzLl9wcmVzc0V2ZW50cywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbnByZXNzKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gbm8gaGFuZGxlKHMpIHNwZWNpZmllZCwgdXNlIHRoZSBlbGVtZW50IGFzIHRoZSBoYW5kbGVcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQub24odGhpcy5fcHJlc3NFdmVudHMsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25wcmVzcyhldmVudCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2hhc1RvdWNoICYmIHRoaXMuJGVsZW1lbnRbMF0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSBcImltZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24nLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSk7IC8vIHByZXZlbnQgbmF0aXZlIGRyYWcgZm9yIGltYWdlc1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRGVzdHJveShlbmFibGUpIHtcclxuICAgICAgICAgICAgdGhpcy50b2dnbGVMaXN0ZW5lcnMoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkVuYWJsZUNoYW5nZShuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICB0aGlzLl9kcmFnRW5hYmxlZCA9IChuZXdWYWwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkNlbnRlckFuY2hvcihuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQobmV3VmFsKSlcclxuICAgICAgICAgICAgICAgIHRoaXMuX2NlbnRlckFuY2hvciA9IChuZXdWYWwgfHwgJ3RydWUnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaXNDbGlja2FibGVFbGVtZW50KGV2dCkge1xyXG4gICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgYW5ndWxhci5pc0RlZmluZWQoYW5ndWxhci5lbGVtZW50KGV2dC50YXJnZXQpLmF0dHIoXCJwaXAtY2FuY2VsLWRyYWdcIikpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgICAqIFdoZW4gdGhlIGVsZW1lbnQgaXMgY2xpY2tlZCBzdGFydCB0aGUgZHJhZyBiZWhhdmlvdXJcclxuICAgICAgICAgKiBPbiB0b3VjaCBkZXZpY2VzIGFzIGEgc21hbGwgZGVsYXkgc28gYXMgbm90IHRvIHByZXZlbnQgbmF0aXZlIHdpbmRvdyBzY3JvbGxpbmdcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIG9ucHJlc3MoZXZ0KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJhZ0VuYWJsZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQ2xpY2thYmxlRWxlbWVudChldnQpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChldnQudHlwZSA9PSBcIm1vdXNlZG93blwiICYmIGV2dC5idXR0b24gIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8gRG8gbm90IHN0YXJ0IGRyYWdnaW5nIG9uIHJpZ2h0LWNsaWNrXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2F2ZUVsZW1lbnRTdHlsZXMoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9oYXNUb3VjaCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxQcmVzcygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fcHJlc3NUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9ubG9uZ3ByZXNzKGV2dCk7XHJcbiAgICAgICAgICAgICAgICB9LCB0aGlzLkxPTkdfUFJFU1MpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub24odGhpcy5fbW92ZUV2ZW50cywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub24odGhpcy5fcmVsZWFzZUV2ZW50cywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbmxvbmdwcmVzcyhldnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHNhdmVFbGVtZW50U3R5bGVzKCkge1xyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50U3R5bGUubGVmdCA9IHRoaXMuJGVsZW1lbnQuY3NzKCdjc3MnKSB8fCAwO1xyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50U3R5bGUudG9wID0gdGhpcy4kZWxlbWVudC5jc3MoJ3RvcCcpIHx8IDA7XHJcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnRTdHlsZS5wb3NpdGlvbiA9IHRoaXMuJGVsZW1lbnQuY3NzKCdwb3NpdGlvbicpO1xyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50U3R5bGUud2lkdGggPSB0aGlzLiRlbGVtZW50LmNzcygnd2lkdGgnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY2FuY2VsUHJlc3MoKSB7XHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9wcmVzc1RpbWVyKTtcclxuICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub2ZmKHRoaXMuX21vdmVFdmVudHMsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJGRvY3VtZW50Lm9mZih0aGlzLl9yZWxlYXNlRXZlbnRzLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbmxvbmdwcmVzcyhldnQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9kcmFnRW5hYmxlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0ID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYWxsb3dUcmFuc2Zvcm0pXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9kcmFnT2Zmc2V0ID0gdGhpcy5vZmZzZXQ7XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZHJhZ09mZnNldCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICggPCBhbnkgPiB0aGlzLiRlbGVtZW50KS5jZW50ZXJYID0gdGhpcy4kZWxlbWVudFswXS5vZmZzZXRXaWR0aCAvIDI7XHJcbiAgICAgICAgICAgICggPCBhbnkgPiB0aGlzLiRlbGVtZW50KS5jZW50ZXJZID0gdGhpcy4kZWxlbWVudFswXS5vZmZzZXRIZWlnaHQgLyAyO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fbXggPSB0aGlzLnBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVg7XHJcbiAgICAgICAgICAgIHRoaXMuX215ID0gdGhpcy5waXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VZO1xyXG4gICAgICAgICAgICB0aGlzLl9tcnggPSB0aGlzLl9teCAtIHRoaXMub2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgIHRoaXMuX21yeSA9IHRoaXMuX215IC0gdGhpcy5vZmZzZXQudG9wO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fY2VudGVyQW5jaG9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eCA9IHRoaXMuX214IC0gKCA8IGFueSA+IHRoaXMuJGVsZW1lbnQpLmNlbnRlclggLSB0aGlzLiR3aW5kb3cucGFnZVhPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eSA9IHRoaXMuX215IC0gKCA8IGFueSA+IHRoaXMuJGVsZW1lbnQpLmNlbnRlclkgLSB0aGlzLiR3aW5kb3cucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eCA9IHRoaXMuX214IC0gdGhpcy5fbXJ4IC0gdGhpcy4kd2luZG93LnBhZ2VYT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdHkgPSB0aGlzLl9teSAtIHRoaXMuX21yeSAtIHRoaXMuJHdpbmRvdy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub24odGhpcy5fbW92ZUV2ZW50cywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9ubW92ZShldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLiRkb2N1bWVudC5vbih0aGlzLl9yZWxlYXNlRXZlbnRzLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25yZWxlYXNlKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIFRoaXMgZXZlbnQgaXMgdXNlZCB0byByZWNlaXZlIG1hbnVhbGx5IHRyaWdnZXJlZCBtb3VzZSBtb3ZlIGV2ZW50c1xyXG4gICAgICAgICAgICAvLyBqcUxpdGUgdW5mb3J0dW5hdGVseSBvbmx5IHN1cHBvcnRzIHRyaWdnZXJIYW5kbGVyKC4uLilcclxuICAgICAgICAgICAgLy8gU2VlIGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS90cmlnZ2VySGFuZGxlci9cclxuICAgICAgICAgICAgLy8gX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJ2RyYWdnYWJsZTpfdHJpZ2dlckhhbmRsZXJNb3ZlJywgb25tb3ZlKTtcclxuICAgICAgICAgICAgdGhpcy5fZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSB0aGlzLiRyb290U2NvcGUuJG9uKCdkcmFnZ2FibGU6X3RyaWdnZXJIYW5kbGVyTW92ZScsIChldmVudCwgb3JpZ0V2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9ubW92ZShvcmlnRXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25tb3ZlKGV2dCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2RyYWdFbmFibGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ3BpcC1kcmFnZ2luZycpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9kYXRhID0gdGhpcy5nZXREcmFnRGF0YSh0aGlzLiRzY29wZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdkcmFnZ2FibGU6c3RhcnQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogdGhpcy5fbXgsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogdGhpcy5fbXksXHJcbiAgICAgICAgICAgICAgICAgICAgdHg6IHRoaXMuX3R4LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5OiB0aGlzLl90eSxcclxuICAgICAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IHRoaXMuJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogdGhpcy5fZGF0YVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub25EcmFnU3RhcnRDYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRhcHBseSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25EcmFnU3RhcnRDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IHRoaXMuX2RhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IGV2dFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5fbXggPSB0aGlzLnBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVg7XHJcbiAgICAgICAgICAgIHRoaXMuX215ID0gdGhpcy5waXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VZO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNjcm9sbCB8fCB0aGlzLnZlcnRpY2FsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyYWdUb1Njcm9sbCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fY2VudGVyQW5jaG9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eCA9IHRoaXMuX214IC0gKCA8IGFueSA+IHRoaXMuJGVsZW1lbnQpLmNlbnRlclggLSB0aGlzLl9kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eSA9IHRoaXMuX215IC0gKCA8IGFueSA+IHRoaXMuJGVsZW1lbnQpLmNlbnRlclkgLSB0aGlzLl9kcmFnT2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3R4ID0gdGhpcy5fbXggLSB0aGlzLl9tcnggLSB0aGlzLl9kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eSA9IHRoaXMuX215IC0gdGhpcy5fbXJ5IC0gdGhpcy5fZHJhZ09mZnNldC50b3A7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZUVsZW1lbnQodGhpcy5fdHgsIHRoaXMuX3R5KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdkcmFnZ2FibGU6bW92ZScsIHtcclxuICAgICAgICAgICAgICAgIHg6IHRoaXMuX214LFxyXG4gICAgICAgICAgICAgICAgeTogdGhpcy5fbXksXHJcbiAgICAgICAgICAgICAgICB0eDogdGhpcy5fdHgsXHJcbiAgICAgICAgICAgICAgICB0eTogdGhpcy5fdHksXHJcbiAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgZWxlbWVudDogdGhpcy4kZWxlbWVudCxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHRoaXMuX2RhdGEsXHJcbiAgICAgICAgICAgICAgICB1aWQ6IHRoaXMuX215aWQsXHJcbiAgICAgICAgICAgICAgICBkcmFnT2Zmc2V0OiB0aGlzLl9kcmFnT2Zmc2V0XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbnJlbGVhc2UoZXZ0KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJhZ0VuYWJsZWQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOmVuZCcsIHtcclxuICAgICAgICAgICAgICAgIHg6IHRoaXMuX214LFxyXG4gICAgICAgICAgICAgICAgeTogdGhpcy5fbXksXHJcbiAgICAgICAgICAgICAgICB0eDogdGhpcy5fdHgsXHJcbiAgICAgICAgICAgICAgICB0eTogdGhpcy5fdHksXHJcbiAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgZWxlbWVudDogdGhpcy4kZWxlbWVudCxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHRoaXMuX2RhdGEsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogdGhpcy5vbkRyYWdDb21wbGV0ZSxcclxuICAgICAgICAgICAgICAgIHVpZDogdGhpcy5fbXlpZFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWRyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQucGFyZW50KCkuZmluZCgnLnBpcC1kcmFnLWVudGVyJykucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnLWVudGVyJyk7XHJcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcclxuICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub2ZmKHRoaXMuX21vdmVFdmVudHMpO1xyXG4gICAgICAgICAgICB0aGlzLiRkb2N1bWVudC5vZmYodGhpcy5fcmVsZWFzZUV2ZW50cyk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9uRHJhZ1N0b3BDYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuJGFwcGx5KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ1N0b3BDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZGF0YTogdGhpcy5fZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBldnRcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdDb21wbGV0ZShldnQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLm9uRHJhZ1N1Y2Nlc3NDYWxsYmFjaykgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJGFwcGx5KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25EcmFnU3VjY2Vzc0NhbGxiYWNrKHRoaXMuJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGRhdGE6IHRoaXMuX2RhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBldnRcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgcmVzZXQoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmFsbG93VHJhbnNmb3JtKVxyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAnLW1zLXRyYW5zZm9ybSc6ICcnXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMuX2VsZW1lbnRTdHlsZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IHRoaXMuX2VsZW1lbnRTdHlsZS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogdGhpcy5fZWxlbWVudFN0eWxlLmxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGhpcy5fZWxlbWVudFN0eWxlLndpZHRoXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBtb3ZlRWxlbWVudCh4LCB5KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVXaWR0aCA9IHRoaXMuJGVsZW1lbnQuY3NzKCd3aWR0aCcpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5hbGxvd1RyYW5zZm9ybSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiA5OTk5OSxcclxuICAgICAgICAgICAgICAgICAgICAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnbWF0cml4M2QoMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgJyArIHggKyAnLCAnICsgeSArICcsIDAsIDEpJyxcclxuICAgICAgICAgICAgICAgICAgICAnLW1zLXRyYW5zZm9ybSc6ICdtYXRyaXgoMSwgMCwgMCwgMSwgJyArIHggKyAnLCAnICsgeSArICcpJ1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgJ2xlZnQnOiB4ICsgJ3B4JyxcclxuICAgICAgICAgICAgICAgICAgICAndG9wJzogeSArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2ZpeGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogZVdpZHRoXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBkcmFnVG9TY3JvbGwoKSB7XHJcbiAgICAgICAgICAgIGxldCBzY3JvbGxYID0gMCxcclxuICAgICAgICAgICAgICAgIHNjcm9sbFkgPSAwLFxyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ID0gKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vZmZzZXQoKSB8fCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogMFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3RcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJMZWZ0ID0gb2Zmc2V0KHRoaXMuc2Nyb2xsQ29udGFpbmVyKS5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcldpZHRoID0gdGhpcy5zY3JvbGxDb250YWluZXIuaW5uZXJXaWR0aCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclJpZ2h0ID0gY29udGFpbmVyTGVmdCArIGNvbnRhaW5lcldpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICgodGhpcy5fbXggLSBjb250YWluZXJMZWZ0KSA8IHRoaXMuYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWCA9IC10aGlzLnNjcm9sbERpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgoY29udGFpbmVyUmlnaHQgLSB0aGlzLl9teCkgPCB0aGlzLmFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcm9sbFggPSB0aGlzLnNjcm9sbERpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy52ZXJ0aWNhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3RcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3AgPSBvZmZzZXQodGhpcy5zY3JvbGxDb250YWluZXIpLnRvcCxcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJIZWlnaHQgPSB0aGlzLnNjcm9sbENvbnRhaW5lci5pbm5lckhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IGNvbnRhaW5lclRvcCArIGNvbnRhaW5lckhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoKHRoaXMuX215IC0gY29udGFpbmVyVG9wKSA8IHRoaXMuYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWSA9IC10aGlzLnNjcm9sbERpc3RhbmNlICsgMzA7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKChjb250YWluZXJCb3R0b20gLSB0aGlzLl9teSkgPCB0aGlzLmFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcm9sbFkgPSB0aGlzLnNjcm9sbERpc3RhbmNlIC0gMzA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHNjcm9sbFggIT09IDAgfHwgc2Nyb2xsWSAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3RcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJTY3JvbGxMZWZ0ID0gdGhpcy5zY3JvbGxDb250YWluZXIuc2Nyb2xsTGVmdCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbFRvcCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyLnNjcm9sbExlZnQoY29udGFpbmVyU2Nyb2xsTGVmdCArIHNjcm9sbFgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIHNjcm9sbFkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgRHJhZyA9IGZ1bmN0aW9uIChcclxuICAgICAgICAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSxcclxuICAgICAgICAkcGFyc2U6IG5nLklQYXJzZVNlcnZpY2UsXHJcbiAgICAgICAgJGRvY3VtZW50OiBuZy5JRG9jdW1lbnRTZXJ2aWNlLFxyXG4gICAgICAgICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgIHBpcERyYWdnYWJsZTogSURyYWdnYWJsZVNlcnZpY2UsXHJcbiAgICApOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoXHJcbiAgICAgICAgICAgICAgICAkc2NvcGU6IElEcmFnTGlua1Njb3BlLFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgICAgICRhdHRyczogSURyYWdMaW5rQXR0cmlidXRlc1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIG5ldyBEcmFnTGluaygkcm9vdFNjb3BlLCAkcGFyc2UsICRkb2N1bWVudCwgJHdpbmRvdywgcGlwRHJhZ2dhYmxlLCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKFwicGlwRHJhZ2dhYmxlXCIpXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwRHJhZycsIERyYWcpO1xyXG59IiwiaW1wb3J0IHtcclxuICAgIElEcmFnZ2FibGVTZXJ2aWNlXHJcbn0gZnJvbSAnLi9JRHJhZ2dhYmxlU2VydmljZSc7XHJcblxyXG57XHJcbiAgICBjbGFzcyBEcmFnZ2FibGVTZXJ2aWNlIGltcGxlbWVudHMgSURyYWdnYWJsZVNlcnZpY2Uge1xyXG4gICAgICAgIHB1YmxpYyBpbnB1dEV2ZW50KGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChldmVudC50b3VjaGVzKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy9DaGVja2luZyBib3RoIGlzIG5vdCByZWR1bmRlbnQuIElmIG9ubHkgY2hlY2sgaWYgdG91Y2hlcyBpc0RlZmluZWQsIGFuZ3VsYXJqcyBpc0RlZm5pZWQgd2lsbCByZXR1cm4gZXJyb3IgYW5kIHN0b3AgdGhlIHJlbWFpbmluZyBzY3JpcHR5IGlmIGV2ZW50Lm9yaWdpbmFsRXZlbnQgaXMgbm90IGRlZmluZWQuXHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50Lm9yaWdpbmFsRXZlbnQpICYmIGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGV2ZW50O1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIilcclxuICAgICAgICAuc2VydmljZSgncGlwRHJhZ2dhYmxlJywgRHJhZ2dhYmxlU2VydmljZSk7XHJcbn0iLCJpbXBvcnQge1xyXG4gICAgSURyYWdnYWJsZVNlcnZpY2VcclxufSBmcm9tICcuL0lEcmFnZ2FibGVTZXJ2aWNlJztcclxuXHJcbntcclxuICAgIGludGVyZmFjZSBJRHJvcExpbmtTY29wZSBleHRlbmRzIG5nLklTY29wZSB7XHJcbiAgICAgICAgdmFsdWU6IGFueTtcclxuICAgICAgICBpc1RvdWNoaW5nOiBhbnk7XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIElEcm9wTGlua0F0dHJpYnV0ZXMgZXh0ZW5kcyBuZy5JQXR0cmlidXRlcyB7XHJcbiAgICAgICAgcGlwRHJvcDogYW55O1xyXG4gICAgICAgIHBpcERyb3BTdWNjZXNzOiBhbnk7XHJcbiAgICAgICAgcGlwRHJhZ1N0YXJ0OiBhbnk7XHJcbiAgICAgICAgcGlwRHJhZ1N0b3A6IGFueTtcclxuICAgICAgICBwaXBEcmFnTW92ZTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIERyb3BMaW5rIHtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfbGFzdERyb3BUb3VjaDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgX215aWQ6IG51bWJlciB8IHN0cmluZztcclxuICAgICAgICBwcml2YXRlIF9kcm9wRW5hYmxlZDogYm9vbGVhbjtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyb3BDYWxsYmFjazogRnVuY3Rpb247IC8vIHx8IGZ1bmN0aW9uKCl7fTtcclxuICAgICAgICBwcml2YXRlIG9uRHJhZ1N0YXJ0Q2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHByaXZhdGUgb25EcmFnU3RvcENhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgICAgICBwcml2YXRlIG9uRHJhZ01vdmVDYWxsYmFjazogRnVuY3Rpb247XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZG9jdW1lbnQ6IG5nLklEb2N1bWVudFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSBwaXBEcmFnZ2FibGU6IElEcmFnZ2FibGVTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRzY29wZTogSURyb3BMaW5rU2NvcGUsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkYXR0cnM6IElEcm9wTGlua0F0dHJpYnV0ZXNcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgJHNjb3BlLnZhbHVlID0gJGF0dHJzLnBpcERyb3A7XHJcbiAgICAgICAgICAgICRzY29wZS5pc1RvdWNoaW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9teWlkID0gJHNjb3BlLiRpZDtcclxuICAgICAgICAgICAgdGhpcy5vbkRyb3BDYWxsYmFjayA9ICRwYXJzZSgkYXR0cnMucGlwRHJvcFN1Y2Nlc3MpOyAvLyB8fCBmdW5jdGlvbigpe307XHJcbiAgICAgICAgICAgIHRoaXMub25EcmFnU3RhcnRDYWxsYmFjayA9ICRwYXJzZSgkYXR0cnMucGlwRHJhZ1N0YXJ0KTtcclxuICAgICAgICAgICAgdGhpcy5vbkRyYWdTdG9wQ2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdTdG9wKTtcclxuICAgICAgICAgICAgdGhpcy5vbkRyYWdNb3ZlQ2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdNb3ZlKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgdG9nZ2xlTGlzdGVuZXJzKGVuYWJsZSkge1xyXG4gICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgIGlmICghZW5hYmxlKSByZXR1cm47XHJcbiAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiR3YXRjaCh0aGlzLiRhdHRycy5waXBEcm9wLCAobmV3VmFsLCBvbGRWYWwpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCckZGVzdHJveScsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkRlc3Ryb3koZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdkcmFnZ2FibGU6c3RhcnQnLCAoZXZ0LCBvYmopID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25EcmFnU3RhcnQoZXZ0LCBvYmopO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdkcmFnZ2FibGU6bW92ZScsIChldnQsIG9iaikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdNb3ZlKGV2dCwgb2JqKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRvbignZHJhZ2dhYmxlOmVuZCcsIChldnQsIG9iaikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdFbmQoZXZ0LCBvYmopO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25EZXN0cm95KGVuYWJsZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZUxpc3RlbmVycyhmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRW5hYmxlQ2hhbmdlKG5ld1ZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2Ryb3BFbmFibGVkID0gbmV3VmFsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdTdGFydChldnQsIG9iaikge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2Ryb3BFbmFibGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIHRoaXMuaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLiRhdHRycy5waXBEcmFnU3RhcnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25EcmFnU3RhcnRDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZGF0YTogb2JqLmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDogb2JqXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdNb3ZlKGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJvcEVuYWJsZWQpIHJldHVybjtcclxuICAgICAgICAgICAgdGhpcy5pc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuJGF0dHJzLnBpcERyYWdNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ01vdmVDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZGF0YTogb2JqLmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDogb2JqXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdFbmQoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgLy8gZG9uJ3QgbGlzdGVuIHRvIGRyb3AgZXZlbnRzIGlmIHRoaXMgaXMgdGhlIGVsZW1lbnQgYmVpbmcgZHJhZ2dlZFxyXG4gICAgICAgICAgICAvLyBvbmx5IHVwZGF0ZSB0aGUgc3R5bGVzIGFuZCByZXR1cm5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9kcm9wRW5hYmxlZCB8fCB0aGlzLl9teWlkID09PSBvYmoudWlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZURyYWdTdHlsZXMoZmFsc2UsIG9iai5lbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgLy8gY2FsbCB0aGUgcGlwRHJhZ2dhYmxlIHBpcERyYWdTdWNjZXNzIGVsZW1lbnQgY2FsbGJhY2tcclxuICAgICAgICAgICAgICAgIGlmIChvYmouY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICBvYmouY2FsbGJhY2sob2JqKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kYXR0cnMucGlwRHJvcFN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkRyb3BDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IG9iai5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBvYmosXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGFyZ2V0OiB0aGlzLiRzY29wZS4kZXZhbCh0aGlzLiRzY29wZS52YWx1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLiRhdHRycy5waXBEcmFnU3RvcCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdTdG9wQ2FsbGJhY2sodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IG9iai5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IG9ialxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRHJhZ1N0eWxlcyhmYWxzZSwgb2JqLmVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpc1RvdWNoaW5nKG1vdXNlWCwgbW91c2VZLCBkcmFnRWxlbWVudCkge1xyXG4gICAgICAgICAgICBjb25zdCB0b3VjaGluZyA9IHRoaXMuaGl0VGVzdChtb3VzZVgsIG1vdXNlWSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLmlzVG91Y2hpbmcgPSB0b3VjaGluZztcclxuICAgICAgICAgICAgaWYgKHRvdWNoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9sYXN0RHJvcFRvdWNoID0gdGhpcy4kZWxlbWVudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZURyYWdTdHlsZXModG91Y2hpbmcsIGRyYWdFbGVtZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIHRvdWNoaW5nO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSB1cGRhdGVEcmFnU3R5bGVzKHRvdWNoaW5nLCBkcmFnRWxlbWVudCkge1xyXG4gICAgICAgICAgICBpZiAodG91Y2hpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1kcmFnLWVudGVyJyk7XHJcbiAgICAgICAgICAgICAgICBkcmFnRWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2xhc3REcm9wVG91Y2ggPT0gdGhpcy4kZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbGFzdERyb3BUb3VjaCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0VsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnLW92ZXInKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGl0VGVzdCh4LCB5KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvdW5kcyA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgIHggLT0gdGhpcy4kZG9jdW1lbnRbMF0uYm9keS5zY3JvbGxMZWZ0ICsgdGhpcy4kZG9jdW1lbnRbMF0uZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XHJcbiAgICAgICAgICAgIHkgLT0gdGhpcy4kZG9jdW1lbnRbMF0uYm9keS5zY3JvbGxUb3AgKyB0aGlzLiRkb2N1bWVudFswXS5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgICAgICAgICByZXR1cm4geCA+PSBib3VuZHMubGVmdCAmJlxyXG4gICAgICAgICAgICAgICAgeCA8PSBib3VuZHMucmlnaHQgJiZcclxuICAgICAgICAgICAgICAgIHkgPD0gYm91bmRzLmJvdHRvbSAmJlxyXG4gICAgICAgICAgICAgICAgeSA+PSBib3VuZHMudG9wO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBEcm9wID0gZnVuY3Rpb24gKFxyXG4gICAgICAgICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICAkZG9jdW1lbnQ6IG5nLklEb2N1bWVudFNlcnZpY2UsXHJcbiAgICAgICAgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSxcclxuICAgICAgICBwaXBEcmFnZ2FibGU6IElEcmFnZ2FibGVTZXJ2aWNlLFxyXG4gICAgKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiBJRHJvcExpbmtTY29wZSxcclxuICAgICAgICAgICAgICAgICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgICAgICAkYXR0cnM6IElEcm9wTGlua0F0dHJpYnV0ZXNcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgRHJvcExpbmsoJHBhcnNlLCAkZG9jdW1lbnQsICR0aW1lb3V0LCBwaXBEcmFnZ2FibGUsICRzY29wZSwgJGVsZW1lbnQsICRhdHRycyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIilcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBEcm9wJywgRHJvcCk7XHJcbn0iLCJ7XHJcblxyXG4gICAgY2xhc3MgUHJldmVudERyYWdMaW5rIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3BpcC1kcmFnZ2FibGUnLCAnZmFsc2UnKTtcclxuICAgICAgICAgICAgdGhpcy50b2dnbGVMaXN0ZW5lcnModHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xyXG4gICAgICAgICAgICBpZiAoIWVuYWJsZSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24gdG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLCAoZXZlbnQpID0+IHsgdGhpcy5hYnNvcmJFdmVudF8oZXZlbnQpOyB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgYWJzb3JiRXZlbnRfKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGUgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0ICYmIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24gJiYgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBlLnJldHVyblZhbHVlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IFByZXZlbnREcmFnID0gZnVuY3Rpb24gKCk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChcclxuICAgICAgICAgICAgICAgICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgICAgICRhdHRyczogbmcuSUF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgUHJldmVudERyYWdMaW5rKCRlbGVtZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZShcInBpcERyYWdnYWJsZVwiKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcFByZXZlbnREcmFnJywgUHJldmVudERyYWcpO1xyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxyXG5cclxuYW5ndWxhci5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIiwgW10pO1xyXG5cclxuaW1wb3J0ICcuL0RyYWdnYWJsZVNlcnZpY2UnO1xyXG5pbXBvcnQgJy4vRHJhZyc7XHJcbmltcG9ydCAnLi9Ecm9wJztcclxuaW1wb3J0ICcuL1ByZXZlbnREcmFnJztcclxuaW1wb3J0ICcuL0NhbmNlbERyYWcnO1xyXG5cclxuZXhwb3J0ICogZnJvbSAnLi9JRHJhZ2dhYmxlU2VydmljZSc7XHJcbiIsIntcclxuICAgIGludGVyZmFjZSBGb2N1c2VkU2NvcGUgZXh0ZW5kcyBuZy5JU2NvcGUge1xyXG4gICAgICAgIHBpcEZvY3VzZWRDb2xvcjogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZFJlYmluZDogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZFRhYmluZGV4OiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBGb2N1c2VkT3BhY2l0eTogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZERhdGE6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcFdpdGhIaWRkZW46IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcFJlYmluZDogRnVuY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIEZvY3VzZWRBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIG5nTW9kZWw6IGFueTtcclxuICAgICAgICBwaXBGb2N1c2VkRGF0YTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIEZvY3VzZWRMaW5rIGltcGxlbWVudHMgbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcHJpdmF0ZSBjb250cm9sczogSlF1ZXJ5O1xyXG4gICAgICAgIHByaXZhdGUgY29udHJvbHNMZW5ndGg6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIGNvbG9yOiBzdHJpbmc7XHJcbiAgICAgICAgcHJpdmF0ZSBvcGFjaXR5RGVsdGE6IG51bWJlciA9IDAuNDtcclxuICAgICAgICBwcml2YXRlIG9wYWNpdHlMaW1pdDogbnVtYmVyID0gMC41O1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IEZvY3VzZWRTY29wZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAkYXR0cnM6IEZvY3VzZWRBdHRyaWJ1dGVzLFxyXG4gICAgICAgICAgICBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJG1kQ29uc3RhbnQ6IGFueSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZVxyXG4gICAgICAgICkge1xyXG5cclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2tleWRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5rZXlkb3duTGlzdGVuZXIoZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCRhdHRycy5uZ01vZGVsKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCduZ01vZGVsJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KHRoaXMuaW5pdCk7XHJcbiAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCRhdHRycy5waXBGb2N1c2VkRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwRm9jdXNlZERhdGEnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQodGhpcy5pbml0KTtcclxuICAgICAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGluaXQoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gdGhpcy4kc2NvcGUucGlwV2l0aEhpZGRlbiAmJiB0aGlzLiRzY29wZS5waXBXaXRoSGlkZGVuKCkgPyAnLnBpcC1mb2N1c2FibGUnIDogJy5waXAtZm9jdXNhYmxlOnZpc2libGUnO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xzID0gdGhpcy4kZWxlbWVudC5maW5kKHNlbGVjdG9yKTtcclxuICAgICAgICAgICAgdGhpcy5jb250cm9sc0xlbmd0aCA9IHRoaXMuY29udHJvbHMubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLmNoZWNrVGFiaW5kZXgodGhpcy5jb250cm9scyk7XHJcbiAgICAgICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lcnNcclxuICAgICAgICAgICAgdGhpcy5jb250cm9scy5vbignZm9jdXMnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoJCh0YXJnZXQpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kc2NvcGUucGlwUmViaW5kICYmIHRoaXMuJHNjb3BlLnBpcFJlYmluZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy4kc2NvcGUucGlwRm9jdXNlZE9wYWNpdHkgfHwgIXRoaXMuJHNjb3BlLnBpcEZvY3VzZWRPcGFjaXR5KCkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xvciA9ICQodGFyZ2V0KS5jc3MoJ2JhY2tncm91bmRDb2xvcicpO1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIHRoaXMucmdiYSh0aGlzLmNvbG9yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5hZGRDbGFzcygnbWQtZm9jdXNlZCBtZC1mb2N1c2VkLW9wYWNpdHknKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0pLm9uKCdmb2N1c291dCcsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXZlbnQuY3VycmVudFRhcmdldDtcclxuICAgICAgICAgICAgICAgIGlmICghJCh0YXJnZXQpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuJHNjb3BlLnBpcEZvY3VzZWRPcGFjaXR5IHx8ICF0aGlzLiRzY29wZS5waXBGb2N1c2VkT3BhY2l0eSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gJCh0aGlzKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIF9jb2xvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLmNzcygnYmFja2dyb3VuZENvbG9yJywgXCJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkIG1kLWZvY3VzZWQtb3BhY2l0eScpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHJnYmEoY29sb3IpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRDb2xvciAmJiB0aGlzLiRzY29wZS5waXBGb2N1c2VkQ29sb3IoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRDb2xvcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhcnIgPSBjb2xvci5zcGxpdChcIihcIilbMV0uc3BsaXQoXCIpXCIpWzBdLnNwbGl0KFwiLFwiKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghYXJyIHx8IGFyci5sZW5ndGggPCAzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJydcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHJlZCwgYmx1ZSwgZ3JlZW4sIG9wYWNpdHk7XHJcblxyXG4gICAgICAgICAgICBvcGFjaXR5ID0gYXJyLmxlbmd0aCA9PSAzID8gMSA6IHBhcnNlRmxvYXQoYXJyWzNdKTtcclxuICAgICAgICAgICAgcmVkID0gYXJyWzBdO1xyXG4gICAgICAgICAgICBibHVlID0gYXJyWzFdO1xyXG4gICAgICAgICAgICBncmVlbiA9IGFyclsyXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChvcGFjaXR5IDwgdGhpcy5vcGFjaXR5TGltaXQpIHtcclxuICAgICAgICAgICAgICAgIG9wYWNpdHkgKz0gdGhpcy5vcGFjaXR5RGVsdGE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBvcGFjaXR5IC09IHRoaXMub3BhY2l0eURlbHRhO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJ3JnYmEoJyArIHJlZCArICcsICcgKyBibHVlICsgJywgJyArIGdyZWVuICsgJywgJyArIG9wYWNpdHkgKyAnKSc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHNldFRhYmluZGV4KGVsZW1lbnQsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCB2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNoZWNrVGFiaW5kZXgoY29udHJvbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBfLmZpbmRJbmRleChjb250cm9scywgKGMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjWyd0YWJpbmRleCddID4gLTE7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ID09IC0xICYmIGNvbnRyb2xzLmxlbmd0aCA+IDAgJiYgdGhpcy4kc2NvcGUucGlwRm9jdXNlZFRhYmluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFRhYmluZGV4KGFuZ3VsYXIuZWxlbWVudChjb250cm9sc1swXSksIHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRUYWJpbmRleCgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBrZXlkb3duTGlzdGVuZXIoZSkge1xyXG4gICAgICAgICAgICBjb25zdCBrZXlDb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIGNvbnRyb2wga2V5Q29kZVxyXG4gICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkxFRlRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5VUF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPV1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdFxyXG4gICAgICAgICAgICAgICAgICAgIGluY3JlbWVudCA9IChrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHwga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1cpID8gMSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vdmVUb0NvbnRyb2wgPSB0aGlzLmNvbnRyb2xzLmluZGV4KHRoaXMuY29udHJvbHMuZmlsdGVyKFwiLm1kLWZvY3VzZWRcIikpICsgaW5jcmVtZW50O1xyXG4gICAgICAgICAgICAgICAgLy8gTW92ZSBmb2N1cyB0byBuZXh0IGNvbnRyb2xcclxuICAgICAgICAgICAgICAgIGlmIChtb3ZlVG9Db250cm9sID49IDAgJiYgbW92ZVRvQ29udHJvbCA8IHRoaXMuY29udHJvbHNMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRyb2xzW21vdmVUb0NvbnRyb2xdLmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgRm9jdXNlZCA9IGZ1bmN0aW9uICgkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCBcclxuICAgICAgICAkbWRDb25zdGFudDogYW55LCBcclxuICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZVxyXG4gICAgKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRDb2xvcjogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRSZWJpbmQ6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBGb2N1c2VkVGFiaW5kZXg6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBGb2N1c2VkT3BhY2l0eTogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWREYXRhOiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwV2l0aEhpZGRlbjogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcFJlYmluZDogJyY/J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGU6IEZvY3VzZWRTY29wZSwgJGVsZW1lbnQ6IEpRdWVyeSwgJGF0dHJzOiBGb2N1c2VkQXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICAgICAgbmV3IEZvY3VzZWRMaW5rKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgJHRpbWVvdXQsICRtZENvbnN0YW50LCAkd2luZG93KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZShcInBpcEZvY3VzZWRcIiwgW10pXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwRm9jdXNlZCcsIEZvY3VzZWQpO1xyXG59Iiwi77u/aW1wb3J0ICcuL3Vuc2F2ZWRfY2hhbmdlcy9VbnNhdmVkQ2hhbmdlcyc7XHJcbmltcG9ydCAnLi9rZXlib2FyZF9zaG9ydGN1dHMnO1xyXG5pbXBvcnQgJy4vZm9jdXNlZC9Gb2N1c2VkJztcclxuaW1wb3J0ICcuL2RyYWdnYWJsZSc7XHJcbmltcG9ydCAnLi9zZWxlY3RlZC9TZWxlY3RlZCc7XHJcbmltcG9ydCAnLi9mb2N1c2VkL0ZvY3VzZWQnO1xyXG5pbXBvcnQgJy4vaW5maW5pdGVfc2Nyb2xsL0luZmluaXRlU2Nyb2xsJztcclxuXHJcbmFuZ3VsYXIubW9kdWxlKCdwaXBCZWhhdmlvcnMnLCBbXHJcbiAgICAncGlwRm9jdXNlZCcsXHJcbiAgICAncGlwU2VsZWN0ZWQnLFxyXG4gICAgJ3BpcEluZmluaXRlU2Nyb2xsJyxcclxuICAgICdwaXBVbnNhdmVkQ2hhbmdlcycsXHJcbiAgICAncGlwRHJhZ2dhYmxlJyxcclxuICAgICdwaXBTaG9ydGN1dHMnXHJcbl0pO1xyXG5cclxuZXhwb3J0ICogZnJvbSAnLi9rZXlib2FyZF9zaG9ydGN1dHMnO1xyXG5leHBvcnQgKiBmcm9tICcuL2RyYWdnYWJsZSc7Iiwie1xyXG5cclxuICAgIGludGVyZmFjZSBJbmZpbml0ZVNjcm9sbFNjb3BlIGV4dGVuZHMgbmcuSVNjb3BlIHtcclxuICAgICAgICBwaXBJbmZpbml0ZVNjcm9sbDogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwU2Nyb2xsQ29udGFpbmVyOiBKUXVlcnk7XHJcbiAgICAgICAgcGlwU2Nyb2xsRGlzdGFuY2U6IG51bWJlciB8IHN0cmluZztcclxuICAgICAgICBwaXBTY3JvbGxEaXNhYmxlZDogYm9vbGVhbjtcclxuICAgICAgICBwaXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbTogYm9vbGVhbjtcclxuICAgICAgICBwaXBTY3JvbGxMaXN0ZW5Gb3JFdmVudDogc3RyaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGludGVyZmFjZSBJbmZpbml0ZVNjcm9sbEF0dHJpYnV0ZXMgZXh0ZW5kcyBuZy5JQXR0cmlidXRlcyB7XHJcbiAgICAgICAgcGlwU2Nyb2xsUGFyZW50OiBhbnk7XHJcbiAgICAgICAgcGlwU2Nyb2xJbW1lZGlhdGVDaGVjazogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIEluZmluaXRlU2Nyb2xsTGluayB7XHJcbiAgICAgICAgcHJpdmF0ZSBUSFJPVFRMRV9NSUxMSVNFQ09ORFM6IG51bWJlciA9IDUwMDtcclxuICAgICAgICBwcml2YXRlIGNoZWNrV2hlbkVuYWJsZWQgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgc2Nyb2xsQ29udGFpbmVyID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIGltbWVkaWF0ZUNoZWNrID0gdHJ1ZTtcclxuICAgICAgICBwcml2YXRlIHNjcm9sbERpc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIHNjcm9sbEVuYWJsZWQgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgdXNlRG9jdW1lbnRCb3R0b20gPSBmYWxzZTtcclxuICAgICAgICBwcml2YXRlIHdpbmRvd0VsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgb25Db250YWluZXJTY3JvbGxUaHJvdHRsZTogRnVuY3Rpb247XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRpbnRlcnZhbDogbmcuSUludGVydmFsU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IEluZmluaXRlU2Nyb2xsU2NvcGUsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkYXR0cnM6IEluZmluaXRlU2Nyb2xsQXR0cmlidXRlc1xyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICB0aGlzLndpbmRvd0VsZW1lbnQgPSBhbmd1bGFyLmVsZW1lbnQoJHdpbmRvdyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUgPSBfLnRocm90dGxlKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGwoKTtcclxuICAgICAgICAgICAgfSwgdGhpcy5USFJPVFRMRV9NSUxMSVNFQ09ORFMpO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lci51bmJpbmQoJ3Njcm9sbCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVucmVnaXN0ZXJFdmVudExpc3RlbmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbERpc3RhbmNlJywgKHYpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsRGlzdGFuY2Uodik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbERpc3RhbmNlKCRzY29wZS5waXBTY3JvbGxEaXN0YW5jZSk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBTY3JvbGxEaXNhYmxlZCcsICh2KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbERpc2FibGVkKHYpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxEaXNhYmxlZCgkc2NvcGUucGlwU2Nyb2xsRGlzYWJsZWQpO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20nLCAodikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSh2KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20oJHNjb3BlLnBpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlQ29udGFpbmVyKHRoaXMud2luZG93RWxlbWVudCk7XHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUucGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbigkc2NvcGUucGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBTY3JvbGxDb250YWluZXInLCAobmV3Q29udGFpbmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyICE9IHRoaXMuc2Nyb2xsQ29udGFpbmVyKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsQ29udGFpbmVyKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbENvbnRhaW5lcigkc2NvcGUucGlwU2Nyb2xsQ29udGFpbmVyIHx8IFtdKTtcclxuXHJcbiAgICAgICAgICAgIGlmICgkYXR0cnMucGlwU2Nyb2xsUGFyZW50ICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZUNvbnRhaW5lcihhbmd1bGFyLmVsZW1lbnQoJGVsZW1lbnQucGFyZW50KCkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoJGF0dHJzLnBpcFNjcm9sSW1tZWRpYXRlQ2hlY2sgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1tZWRpYXRlQ2hlY2sgPSAkc2NvcGUuJGV2YWwoJGF0dHJzLnBpcFNjcm9sSW1tZWRpYXRlQ2hlY2spO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAkaW50ZXJ2YWwoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmltbWVkaWF0ZUNoZWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KSwgMCwgMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhlaWdodChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50WzBdIHx8IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGlmIChpc05hTihlbGVtZW50Lm9mZnNldEhlaWdodCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb2Zmc2V0VG9wKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgaWYgKCFlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCB8fCBlbGVtZW50LmNzcygnbm9uZScpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICsgdGhpcy5wYWdlWU9mZnNldChlbGVtZW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgcGFnZVlPZmZzZXQoZWxlbWVudCkge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXSB8fCBlbGVtZW50O1xyXG4gICAgICAgICAgICBpZiAoaXNOYU4od2luZG93LnBhZ2VZT2Zmc2V0KSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50Lm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Db250YWluZXJTY3JvbGwoKSB7XHJcbiAgICAgICAgICAgIGxldCBjb250YWluZXJCb3R0b20sXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQsXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tLFxyXG4gICAgICAgICAgICAgICAgcmVtYWluaW5nLFxyXG4gICAgICAgICAgICAgICAgc2hvdWxkU2Nyb2xsO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuc2Nyb2xsQ29udGFpbmVyID09PSB0aGlzLndpbmRvd0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IHRoaXMuaGVpZ2h0KHRoaXMuc2Nyb2xsQ29udGFpbmVyKSArIHRoaXMucGFnZVlPZmZzZXQodGhpcy5zY3JvbGxDb250YWluZXJbMF0uZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSB0aGlzLm9mZnNldFRvcCh0aGlzLiRlbGVtZW50KSArIHRoaXMuaGVpZ2h0KHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gdGhpcy5oZWlnaHQodGhpcy5zY3JvbGxDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyVG9wT2Zmc2V0ID0gMDtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9mZnNldFRvcCh0aGlzLnNjcm9sbENvbnRhaW5lcikgIT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCA9IHRoaXMub2Zmc2V0VG9wKHRoaXMuc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSB0aGlzLm9mZnNldFRvcCh0aGlzLiRlbGVtZW50KSAtIGNvbnRhaW5lclRvcE9mZnNldCArIHRoaXMuaGVpZ2h0KHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy51c2VEb2N1bWVudEJvdHRvbSkge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSA9IHRoaXMuaGVpZ2h0KCh0aGlzLiRlbGVtZW50WzBdLm93bmVyRG9jdW1lbnQgfHwgKCA8IGFueSA+IHRoaXMuJGVsZW1lbnRbMF0pLmRvY3VtZW50KS5kb2N1bWVudEVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZW1haW5pbmcgPSBlbGVtZW50Qm90dG9tIC0gY29udGFpbmVyQm90dG9tO1xyXG4gICAgICAgICAgICBzaG91bGRTY3JvbGwgPSByZW1haW5pbmcgPD0gdGhpcy5oZWlnaHQodGhpcy5zY3JvbGxDb250YWluZXIpICogdGhpcy5zY3JvbGxEaXN0YW5jZSArIDE7XHJcblxyXG4gICAgICAgICAgICBpZiAoc2hvdWxkU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrV2hlbkVuYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2Nyb2xsRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLiRzY29wZS4kJHBoYXNlIHx8IHRoaXMuJHJvb3RTY29wZS4kJHBoYXNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRzY29wZS5waXBJbmZpbml0ZVNjcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRzY29wZS4kYXBwbHkoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUucGlwSW5maW5pdGVTY3JvbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2hlY2tXaGVuRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNjcm9sbERpc3RhbmNlKHYpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Nyb2xsRGlzdGFuY2UgPSBwYXJzZUZsb2F0KHYpIHx8IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNjcm9sbERpc2FibGVkKHYpIHtcclxuICAgICAgICAgICAgdGhpcy5zY3JvbGxFbmFibGVkID0gIXY7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbEVuYWJsZWQgJiYgdGhpcy5jaGVja1doZW5FbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrV2hlbkVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKHYpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudXNlRG9jdW1lbnRCb3R0b20gPSB2O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjaGFuZ2VDb250YWluZXIobmV3Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbENvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIudW5iaW5kKCdzY3JvbGwnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIgPSBuZXdDb250YWluZXI7XHJcbiAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNjcm9sbENvbnRhaW5lci5iaW5kKCdzY3JvbGwnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTY3JvbGxDb250YWluZXIobmV3Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIGlmICgobmV3Q29udGFpbmVyID09IG51bGwpIHx8IG5ld0NvbnRhaW5lci5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChuZXdDb250YWluZXIpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBuZXdDb250YWluZXIuYXBwZW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQobmV3Q29udGFpbmVyW25ld0NvbnRhaW5lci5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld0NvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IHRoaXMuJGVsZW1lbnQucGFyZW50cygpLmZpbmQobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPSBudWxsICYmICghQXJyYXkuaXNBcnJheShuZXdDb250YWluZXIpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgKEFycmF5LmlzQXJyYXkobmV3Q29udGFpbmVyKSAmJiBuZXdDb250YWluZXIubGVuZ3RoID4gMCkpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jaGFuZ2VDb250YWluZXIobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcGlwLXNjcm9sbC1jb250YWluZXIgYXR0cmlidXRlLlwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgSW5maW5pdGVTY3JvbGwgPSBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UsXHJcbiAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgJGludGVydmFsOiBuZy5JSW50ZXJ2YWxTZXJ2aWNlXHJcbiAgICApOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgcGlwSW5maW5pdGVTY3JvbGw6ICcmJyxcclxuICAgICAgICAgICAgICAgIHBpcFNjcm9sbENvbnRhaW5lcjogJz0nLFxyXG4gICAgICAgICAgICAgICAgcGlwU2Nyb2xsRGlzdGFuY2U6ICc9JyxcclxuICAgICAgICAgICAgICAgIHBpcFNjcm9sbERpc2FibGVkOiAnPScsXHJcbiAgICAgICAgICAgICAgICBwaXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbTogJz0nLFxyXG4gICAgICAgICAgICAgICAgcGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQ6ICdAJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoXHJcbiAgICAgICAgICAgICAgICAkc2NvcGU6IEluZmluaXRlU2Nyb2xsU2NvcGUsXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAgICAgJGF0dHJzOiBJbmZpbml0ZVNjcm9sbEF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgSW5maW5pdGVTY3JvbGxMaW5rKCRyb290U2NvcGUsICR3aW5kb3csICRpbnRlcnZhbCwgJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZShcInBpcEluZmluaXRlU2Nyb2xsXCIsIFtdKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcEluZmluaXRlU2Nyb2xsJywgSW5maW5pdGVTY3JvbGwpO1xyXG59IiwiZXhwb3J0IGNsYXNzIFNob3J0Y3V0T3B0aW9uIHtcclxuICAgIFR5cGU6IEtleWJvYXJkRXZlbnQ7XHJcbiAgICBQcm9wYWdhdGU6IGJvb2xlYW47XHJcbiAgICBEaXNhYmxlSW5JbnB1dDogYm9vbGVhbjtcclxuICAgIFRhcmdldDogYW55OyAvLyBFdmVudCB0YXJnZXQgb2JqZWN0XHJcbiAgICBLZXljb2RlOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBLZXlib2FyZEV2ZW50IHtcclxuICAgIHN0YXRpYyBLZXlkb3duOiBzdHJpbmcgPSAna2V5ZG93bic7XHJcbiAgICBzdGF0aWMgS2V5dXA6IHN0cmluZyA9ICdrZXl1cCc7XHJcbiAgICBzdGF0aWMgS2V5cHJlc3M6IHN0cmluZyA9ICdrZXlwcmVzcyc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBLZXlib2FyZFNob3J0Y3V0IHtcclxuICAgIHByaXZhdGUgc2hpZnRfbnVtcyA9IHtcclxuICAgICAgICBcImBcIjogXCJ+XCIsXHJcbiAgICAgICAgXCIxXCI6IFwiIVwiLFxyXG4gICAgICAgIFwiMlwiOiBcIkBcIixcclxuICAgICAgICBcIjNcIjogXCIjXCIsXHJcbiAgICAgICAgXCI0XCI6IFwiJFwiLFxyXG4gICAgICAgIFwiNVwiOiBcIiVcIixcclxuICAgICAgICBcIjZcIjogXCJeXCIsXHJcbiAgICAgICAgXCI3XCI6IFwiJlwiLFxyXG4gICAgICAgIFwiOFwiOiBcIipcIixcclxuICAgICAgICBcIjlcIjogXCIoXCIsXHJcbiAgICAgICAgXCIwXCI6IFwiKVwiLFxyXG4gICAgICAgIFwiLVwiOiBcIl9cIixcclxuICAgICAgICBcIj1cIjogXCIrXCIsXHJcbiAgICAgICAgXCI7XCI6IFwiOlwiLFxyXG4gICAgICAgIFwiJ1wiOiBcIlxcXCJcIixcclxuICAgICAgICBcIixcIjogXCI8XCIsXHJcbiAgICAgICAgXCIuXCI6IFwiPlwiLFxyXG4gICAgICAgIFwiL1wiOiBcIj9cIixcclxuICAgICAgICBcIlxcXFxcIjogXCJ8XCJcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBzcGVjaWFsX2tleXMgPSB7XHJcbiAgICAgICAgJ2VzYyc6IDI3LFxyXG4gICAgICAgICdlc2NhcGUnOiAyNyxcclxuICAgICAgICAndGFiJzogOSxcclxuICAgICAgICAnc3BhY2UnOiAzMixcclxuICAgICAgICAncmV0dXJuJzogMTMsXHJcbiAgICAgICAgJ2VudGVyJzogMTMsXHJcbiAgICAgICAgJ2JhY2tzcGFjZSc6IDgsXHJcblxyXG4gICAgICAgICdzY3JvbGxsb2NrJzogMTQ1LFxyXG4gICAgICAgICdzY3JvbGxfbG9jayc6IDE0NSxcclxuICAgICAgICAnc2Nyb2xsJzogMTQ1LFxyXG4gICAgICAgICdjYXBzbG9jayc6IDIwLFxyXG4gICAgICAgICdjYXBzX2xvY2snOiAyMCxcclxuICAgICAgICAnY2Fwcyc6IDIwLFxyXG4gICAgICAgICdudW1sb2NrJzogMTQ0LFxyXG4gICAgICAgICdudW1fbG9jayc6IDE0NCxcclxuICAgICAgICAnbnVtJzogMTQ0LFxyXG5cclxuICAgICAgICAncGF1c2UnOiAxOSxcclxuICAgICAgICAnYnJlYWsnOiAxOSxcclxuXHJcbiAgICAgICAgJ2luc2VydCc6IDQ1LFxyXG4gICAgICAgICdob21lJzogMzYsXHJcbiAgICAgICAgJ2RlbGV0ZSc6IDQ2LFxyXG4gICAgICAgICdlbmQnOiAzNSxcclxuXHJcbiAgICAgICAgJ3BhZ2V1cCc6IDMzLFxyXG4gICAgICAgICdwYWdlX3VwJzogMzMsXHJcbiAgICAgICAgJ3B1JzogMzMsXHJcblxyXG4gICAgICAgICdwYWdlZG93bic6IDM0LFxyXG4gICAgICAgICdwYWdlX2Rvd24nOiAzNCxcclxuICAgICAgICAncGQnOiAzNCxcclxuXHJcbiAgICAgICAgJ2xlZnQnOiAzNyxcclxuICAgICAgICAndXAnOiAzOCxcclxuICAgICAgICAncmlnaHQnOiAzOSxcclxuICAgICAgICAnZG93bic6IDQwLFxyXG5cclxuICAgICAgICAnZjEnOiAxMTIsXHJcbiAgICAgICAgJ2YyJzogMTEzLFxyXG4gICAgICAgICdmMyc6IDExNCxcclxuICAgICAgICAnZjQnOiAxMTUsXHJcbiAgICAgICAgJ2Y1JzogMTE2LFxyXG4gICAgICAgICdmNic6IDExNyxcclxuICAgICAgICAnZjcnOiAxMTgsXHJcbiAgICAgICAgJ2Y4JzogMTE5LFxyXG4gICAgICAgICdmOSc6IDEyMCxcclxuICAgICAgICAnZjEwJzogMTIxLFxyXG4gICAgICAgICdmMTEnOiAxMjIsXHJcbiAgICAgICAgJ2YxMic6IDEyM1xyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIG1vZGlmaWVycyA9IHtcclxuICAgICAgICBzaGlmdDogeyB3YW50ZWQ6IGZhbHNlLCBwcmVzc2VkOiBmYWxzZSB9LFxyXG4gICAgICAgIGN0cmw6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfSxcclxuICAgICAgICBhbHQ6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfSxcclxuICAgICAgICBtZXRhOiB7IHdhbnRlZDogZmFsc2UsIHByZXNzZWQ6IGZhbHNlIH1cdC8vIE1ldGEgaXMgTWFjIHNwZWNpZmljXHJcbiAgICB9O1xyXG5cclxuICAgIHB1YmxpYyBldmVudENhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgIHB1YmxpYyB0YXJnZXQ6IGFueTtcclxuICAgIHB1YmxpYyBldmVudDogS2V5Ym9hcmRFdmVudDtcclxuICAgIHB1YmxpYyBvcHRpb246IFNob3J0Y3V0T3B0aW9uO1xyXG4gICAgcHVibGljIHNob3JjdXQ6IHN0cmluZztcclxuICAgIHB1YmxpYyBjYWxsYmFjazogRnVuY3Rpb247XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIGVsZW1lbnQ6IGFueSxcclxuICAgICAgICBzaG9yY3V0Q29tYmluYXRpb246IHN0cmluZyxcclxuICAgICAgICBvcHRpb246IFNob3J0Y3V0T3B0aW9uLFxyXG4gICAgICAgIGNhbGxiYWNrOiAoZT86IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB2b2lkXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgIHRoaXMudGFyZ2V0ID0gZWxlbWVudDtcclxuICAgICAgICB0aGlzLnNob3JjdXQgPSBzaG9yY3V0Q29tYmluYXRpb247XHJcbiAgICAgICAgdGhpcy5ldmVudCA9IG9wdGlvbi5UeXBlO1xyXG4gICAgICAgIHRoaXMub3B0aW9uID0gb3B0aW9uO1xyXG4gICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcclxuXHJcbiAgICAgICAgdGhpcy5ldmVudENhbGxiYWNrID0gKGV2ZW50OiBKUXVlcnlFdmVudE9iamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZTogSlF1ZXJ5RXZlbnRPYmplY3QgPSBldmVudCB8fCA8SlF1ZXJ5RXZlbnRPYmplY3Q+d2luZG93LmV2ZW50O1xyXG4gICAgICAgICAgICBsZXQgY29kZTogbnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9uLkRpc2FibGVJbklucHV0KSB7IC8vIERpc2FibGUgc2hvcnRjdXQga2V5cyBpbiBJbnB1dCwgVGV4dGFyZWEgZmllbGRzXHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDtcclxuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlLnRhcmdldDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5zcmNFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGUuc3JjRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5ub2RlVHlwZSA9PSAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnRhZ05hbWUgPT0gJ0lOUFVUJyB8fCBlbGVtZW50LnRhZ05hbWUgPT0gJ1RFWFRBUkVBJykgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIEZpbmQgV2hpY2gga2V5IGlzIHByZXNzZWRcclxuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSkge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IGUua2V5Q29kZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChlLndoaWNoKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gZS53aGljaDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGNoYXJhY3RlciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb2RlID09IDE4OCkgY2hhcmFjdGVyID0gXCIsXCI7IC8vIElmIHRoZSB1c2VyIHByZXNzZXMsIHdoZW4gdGhlIHR5cGUgaXMgb25rZXlkb3duXHJcbiAgICAgICAgICAgIGlmIChjb2RlID09IDE5MCkgY2hhcmFjdGVyID0gXCIuXCI7IC8vIElmIHRoZSB1c2VyIHByZXNzZXMsIHdoZW4gdGhlIHR5cGUgaXMgb25rZXlkb3duXHJcblxyXG4gICAgICAgICAgICBsZXQga2V5czogc3RyaW5nW10gPSB0aGlzLnNob3JjdXQuc3BsaXQoXCIrXCIpO1xyXG4gICAgICAgICAgICAvLyBLZXkgUHJlc3NlZCAtIGNvdW50cyB0aGUgbnVtYmVyIG9mIHZhbGlkIGtleXByZXNzZXMgLSBpZiBpdCBpcyBzYW1lIGFzIHRoZSBudW1iZXIgb2Yga2V5cywgdGhlIHNob3J0Y3V0IGZ1bmN0aW9uIGlzIGludm9rZWRcclxuICAgICAgICAgICAgbGV0IGtwOiBudW1iZXIgPSAwO1xyXG5cclxuICAgICAgICAgICAgaWYgKGUuY3RybEtleSkgdGhpcy5tb2RpZmllcnMuY3RybC5wcmVzc2VkID0gZS5jdHJsS2V5O1xyXG4gICAgICAgICAgICBpZiAoZS5zaGlmdEtleSkgdGhpcy5tb2RpZmllcnMuc2hpZnQucHJlc3NlZCA9IGUuc2hpZnRLZXk7XHJcbiAgICAgICAgICAgIGlmIChlLmFsdEtleSkgdGhpcy5tb2RpZmllcnMuYWx0LnByZXNzZWQgPSBlLmFsdEtleTtcclxuICAgICAgICAgICAgaWYgKGUubWV0YUtleSkgdGhpcy5tb2RpZmllcnMubWV0YS5wcmVzc2VkID0gZS5tZXRhS2V5O1xyXG5cclxuICAgICAgICAgICAgbGV0IGk6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgazogc3RyaW5nID0ga2V5c1tpXTtcclxuICAgICAgICAgICAgICAgIC8vIE1vZGlmaWVyc1xyXG4gICAgICAgICAgICAgICAgaWYgKGsgPT0gJ2N0cmwnIHx8IGsgPT0gJ2NvbnRyb2wnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5jdHJsLndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsgPT0gJ3NoaWZ0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuc2hpZnQud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoayA9PSAnYWx0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuYWx0LndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsgPT0gJ21ldGEnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5tZXRhLndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsubGVuZ3RoID4gMSkgeyAvLyBJZiBpdCBpcyBhIHNwZWNpYWwga2V5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3BlY2lhbF9rZXlzW2tdID09IGNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9uLktleWNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb24uS2V5Y29kZSA9PSBjb2RlKSBrcCsrO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gVGhlIHNwZWNpYWwga2V5cyBkaWQgbm90IG1hdGNoXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJhY3RlciA9PSBrKSBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zaGlmdF9udW1zW2NoYXJhY3Rlcl0gJiYgZS5zaGlmdEtleSkgeyAvLyBTdHVwaWQgU2hpZnQga2V5IGJ1ZyBjcmVhdGVkIGJ5IHVzaW5nIGxvd2VyY2FzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhcmFjdGVyID0gdGhpcy5zaGlmdF9udW1zW2NoYXJhY3Rlcl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhcmFjdGVyID09IGspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoa3AgPT0ga2V5cy5sZW5ndGggJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmN0cmwucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5jdHJsLndhbnRlZCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuc2hpZnQucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5zaGlmdC53YW50ZWQgJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmFsdC5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLmFsdC53YW50ZWQgJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLm1ldGEucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5tZXRhLndhbnRlZCkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2soZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9wdGlvbi5Qcm9wYWdhdGUpIHsgLy8gU3RvcCB0aGUgZXZlbnRcclxuICAgICAgICAgICAgICAgICAgICAvLyBlLmNhbmNlbEJ1YmJsZSBpcyBzdXBwb3J0ZWQgYnkgSUUgLSB0aGlzIHdpbGwga2lsbCB0aGUgYnViYmxpbmcgcHJvY2Vzcy5cclxuICAgICAgICAgICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBlLnN0b3BQcm9wYWdhdGlvbiB3b3JrcyBpbiBGaXJlZm94LlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuY3RybC5wcmVzc2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLnNoaWZ0LnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuYWx0LnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMubWV0YS5wcmVzc2VkID0gZmFsc2U7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQge1xyXG4gICAgS2V5Ym9hcmRTaG9ydGN1dCxcclxuICAgIFNob3J0Y3V0T3B0aW9uLFxyXG4gICAgS2V5Ym9hcmRFdmVudFxyXG59IGZyb20gXCIuL0tleWJvYXJkU2hvcnRjdXRcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSUtleWJvYXJkU2hvcnRjdXRzIHtcclxuICAgIFtrZXk6IHN0cmluZ106IEtleWJvYXJkU2hvcnRjdXRcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlIHtcclxuICAgIGFkZChzaG9yY3V0TmFtZTogc3RyaW5nLCBjYWxsYmFjazogKCkgPT4gdm9pZCwgb3B0aW9uczogU2hvcnRjdXRPcHRpb24pOiB2b2lkO1xyXG4gICAgcmVtb3ZlKHNob3JjdXROYW1lOiBzdHJpbmcpOiB2b2lkO1xyXG5cclxuICAgIHNob3JjdXRzOiBJS2V5Ym9hcmRTaG9ydGN1dHNcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzUmVnaXN0ZXJQcm92aWRlciBleHRlbmRzIG5nLklTZXJ2aWNlUHJvdmlkZXIge1xyXG4gICAgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZSBpbXBsZW1lbnRzIElTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2Uge1xyXG4gICAgcHJpdmF0ZSBfbG9nOiBuZy5JTG9nU2VydmljZTtcclxuICAgIHByaXZhdGUgX2RlZmF1bHRPcHRpb246IFNob3J0Y3V0T3B0aW9uO1xyXG4gICAgcHJpdmF0ZSBfc2hvcnRjdXRzOiBJS2V5Ym9hcmRTaG9ydGN1dHM7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgIG9wdGlvbjogU2hvcnRjdXRPcHRpb25cclxuICAgICkge1xyXG4gICAgICAgIFwibmdJbmplY3RcIjtcclxuICAgICAgICB0aGlzLl9sb2cgPSAkbG9nO1xyXG4gICAgICAgIHRoaXMuX2RlZmF1bHRPcHRpb24gPSBvcHRpb24gPyBfLmRlZmF1bHRzKG9wdGlvbiwgdGhpcy5nZXREZWZhdWx0T3B0aW9uKCkpIDogdGhpcy5nZXREZWZhdWx0T3B0aW9uKCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3Nob3J0Y3V0cyA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0RGVmYXVsdE9wdGlvbigpOiBTaG9ydGN1dE9wdGlvbiB7XHJcbiAgICAgICAgbGV0IGRlZmF1bHRPcHRpb246IFNob3J0Y3V0T3B0aW9uID0ge1xyXG4gICAgICAgICAgICBUeXBlOiBLZXlib2FyZEV2ZW50LktleWRvd24sXHJcbiAgICAgICAgICAgIFByb3BhZ2F0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgIERpc2FibGVJbklucHV0OiBmYWxzZSxcclxuICAgICAgICAgICAgVGFyZ2V0OiBkb2N1bWVudCxcclxuICAgICAgICAgICAgS2V5Y29kZTogbnVsbFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBkZWZhdWx0T3B0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2hlY2tBZGRTaG9ydGN1dChlbGVtZW50OiBhbnksIHNob3JjdXRDb21iaW5hdGlvbjogc3RyaW5nLCBjYWxsYmFjazogKGU6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB2b2lkKTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKCFlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvZy5lcnJvcignUmVnaXN0ZXIgc2hvcnRjdXQ6IGVsZW1lbnQgdW5kZW50aWZpZWQhJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXNob3JjdXRDb21iaW5hdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1JlZ2lzdGVyIHNob3J0Y3V0OiBzaG9yY3V0IGNvbWJpbmF0aW9uIHVuZGVudGlmaWVkIScpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFjYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1JlZ2lzdGVyIHNob3J0Y3V0OiBzaG9yY3V0IGNhbGxiYWNrIHVuZGVudGlmaWVkIScpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBzaG9yY3V0cygpOiBJS2V5Ym9hcmRTaG9ydGN1dHMge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFkZChzaG9yY3V0TmFtZTogc3RyaW5nLCBjYWxsYmFjazogKGU6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB2b2lkLCBvcHRpb246IFNob3J0Y3V0T3B0aW9uKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5yZW1vdmUoc2hvcmN1dE5hbWUpO1xyXG4gICAgICAgIGxldCBzaG9yY3V0T3B0aW9uOiBTaG9ydGN1dE9wdGlvbiA9IG9wdGlvbiA/IF8uZGVmYXVsdHMob3B0aW9uLCB0aGlzLl9kZWZhdWx0T3B0aW9uKSA6IHRoaXMuX2RlZmF1bHRPcHRpb247XHJcbiAgICAgICAgbGV0IHNob3JjdXRDb21iaW5hdGlvbjogc3RyaW5nID0gc2hvcmN1dE5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICBsZXQgZWxlbWVudCA9IHNob3JjdXRPcHRpb24uVGFyZ2V0O1xyXG5cclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBzaG9yY3V0T3B0aW9uLlRhcmdldCA9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2hvcmN1dE9wdGlvbi5UYXJnZXQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBzaG9yY3V0T3B0aW9uLlRhcmdldDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5jaGVja0FkZFNob3J0Y3V0KGVsZW1lbnQsIHNob3JjdXRDb21iaW5hdGlvbiwgY2FsbGJhY2spKSB7XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBuZXdLZXlib2FyZFNob3J0Y3V0ID0gbmV3IEtleWJvYXJkU2hvcnRjdXQoZWxlbWVudCwgc2hvcmN1dENvbWJpbmF0aW9uLCBzaG9yY3V0T3B0aW9uLCBjYWxsYmFjayk7XHJcblxyXG4gICAgICAgIHRoaXMuX3Nob3J0Y3V0c1tzaG9yY3V0Q29tYmluYXRpb25dID0gbmV3S2V5Ym9hcmRTaG9ydGN1dDtcclxuXHJcbiAgICAgICAgLy9BdHRhY2ggdGhlIGZ1bmN0aW9uIHdpdGggdGhlIGV2ZW50XHJcbiAgICAgICAgaWYgKGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcikge1xyXG4gICAgICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoc2hvcmN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYXR0YWNoRXZlbnQpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5hdHRhY2hFdmVudCgnb24nICsgc2hvcmN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2spO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQub24oc2hvcmN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgcmVtb3ZlKHNob3JjdXROYW1lOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICBsZXQgc2hvcnRjdXRDb21iaW5hdGlvbiA9IHNob3JjdXROYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgbGV0IGJpbmRpbmc6IEtleWJvYXJkU2hvcnRjdXQgPSB0aGlzLl9zaG9ydGN1dHNbc2hvcnRjdXRDb21iaW5hdGlvbl07XHJcblxyXG4gICAgICAgIGRlbGV0ZSh0aGlzLl9zaG9ydGN1dHNbc2hvcnRjdXRDb21iaW5hdGlvbl0pXHJcbiAgICAgICAgaWYgKCFiaW5kaW5nKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCB0eXBlID0gYmluZGluZy5ldmVudDtcclxuICAgICAgICBsZXQgZWxlbWVudCA9IGJpbmRpbmcudGFyZ2V0O1xyXG4gICAgICAgIGxldCBjYWxsYmFjayA9IGJpbmRpbmcuZXZlbnRDYWxsYmFjaztcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQuZGV0YWNoRXZlbnQpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5kZXRhY2hFdmVudCgnb24nICsgdHlwZSwgY2FsbGJhY2spO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgZmFsc2UpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGVsZW1lbnRbJ29uJyArIHR5cGVdID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGVsZW1lbnQub2ZmKHR5cGUsIGNhbGxiYWNrKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbntcclxuICAgIGNsYXNzIFNob3J0Y3V0c1JlZ2lzdGVyUHJvdmlkZXIgaW1wbGVtZW50cyBJU2hvcnRjdXRzUmVnaXN0ZXJQcm92aWRlciB7XHJcbiAgICAgICAgcHJpdmF0ZSBfc2VydmljZTogU2hvcnRjdXRzUmVnaXN0ZXJTZXJ2aWNlO1xyXG4gICAgICAgIHByaXZhdGUgX29wdGlvbjogU2hvcnRjdXRPcHRpb247XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXQgb3B0aW9uKCk6IFNob3J0Y3V0T3B0aW9uIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXQgb3B0aW9uKHZhbHVlOiBTaG9ydGN1dE9wdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLl9vcHRpb24gPSB2YWx1ZSB8fCBuZXcgU2hvcnRjdXRPcHRpb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyAkZ2V0KFxyXG4gICAgICAgICAgICAkbG9nOiBuZy5JTG9nU2VydmljZVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fc2VydmljZSA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fc2VydmljZSA9IG5ldyBTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2UoJGxvZywgdGhpcy5fb3B0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zZXJ2aWNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZSgncGlwU2hvcnRjdXRzJylcclxuICAgICAgICAucHJvdmlkZXIoJ3BpcFNob3J0Y3V0c1JlZ2lzdGVyJywgU2hvcnRjdXRzUmVnaXN0ZXJQcm92aWRlcik7XHJcbn0iLCJpbXBvcnQgIHtcclxuICAgIFNob3J0Y3V0T3B0aW9uLFxyXG59IGZyb20gXCIuL0tleWJvYXJkU2hvcnRjdXRcIjtcclxuXHJcbmltcG9ydCAge1xyXG4gICAgSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZSxcclxufSBmcm9tIFwiLi9TaG9yY3V0c1JlZ2lzdGVyU2VydmljZVwiO1xyXG5cclxuaW50ZXJmYWNlIFNob3J0Y3V0QXR0cmlidXRlcyBleHRlbmRzIG5nLklBdHRyaWJ1dGVzIHtcclxuICAgIHBpcFNob3J0Y3V0QWN0aW9uOiBhbnk7XHJcbiAgICBwaXBTaG9ydGN1dE5hbWU6IGFueTtcclxuICAgIHBpcFNob3JjdXRPcHRpb25zOiBTaG9ydGN1dE9wdGlvbjtcclxufVxyXG5cclxuY2xhc3MgU2hvcnRjdXRDb250cm9sbGVyIGltcGxlbWVudHMgbmcuSUNvbnRyb2xsZXIgIHtcclxuICAgIHByaXZhdGUgYWN0aW9uU2hvcnRjdXRzOiBGdW5jdGlvbjtcclxuICAgIHByaXZhdGUgbmFtZVNob3J0Y3V0czogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBvcHRpb25zOiBTaG9ydGN1dE9wdGlvbjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICRhdHRyczogU2hvcnRjdXRBdHRyaWJ1dGVzLFxyXG4gICAgICAgICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICBwaXBTaG9ydGN1dHNSZWdpc3RlcjogSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZVxyXG4gICAgKSB7XHJcbiAgICAgICAgXCJuZ0luamVjdFwiO1xyXG5cclxuICAgICAgICBpZiAoJGF0dHJzLnBpcFNob3J0Y3V0QWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzID0gJHBhcnNlKCRhdHRycy5waXBTaG9ydGN1dEFjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzKCRzY29wZSwgeyRldmVudDoge319KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAkbG9nLmVycm9yKCdTaG9yY3VudCBhY3Rpb24gZG9lcyBub3Qgc2V0LicpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoJGF0dHJzLnBpcFNob3J0Y3V0TmFtZSAmJiBfLmlzU3RyaW5nKCRhdHRycy5waXBTaG9ydGN1dE5hbWUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZVNob3J0Y3V0cyA9ICRhdHRycy5waXBTaG9ydGN1dE5hbWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgJGxvZy5lcnJvcignU2hvcmN1bnQgbmFtZSBkb2VzIG5vdCBzZXQuJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMub3B0aW9ucyA9ICRhdHRycy5waXBTaG9yY3V0T3B0aW9ucyA/IDxTaG9ydGN1dE9wdGlvbj4kYXR0cnMucGlwU2hvcmN1dE9wdGlvbnMgOiA8U2hvcnRjdXRPcHRpb24+e307XHJcbiAgICAgICAgdGhpcy5vcHRpb25zLlRhcmdldCA9ICRlbGVtZW50O1xyXG4gICAgICAgIC8vIFJlZ2lzdHJhdGlvbiBvZiBrZXlib3JkIHNob3J0Y3V0c1xyXG4gICAgICAgIHBpcFNob3J0Y3V0c1JlZ2lzdGVyLmFkZCh0aGlzLm5hbWVTaG9ydGN1dHMsIChlPzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzKCRzY29wZSwgeyRldmVudDogeydlJzogZX19KTsgICAgICAgICAgXHJcbiAgICAgICAgfSwgdGhpcy5vcHRpb25zKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGtleXByZXNzU2hvcnRjdXQoYWN0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMoKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gUHJldmVudCBqdW5rIGZyb20gZ29pbmcgaW50byB0eXBlc2NyaXB0IGRlZmluaXRpb25zXHJcbntcclxuICAgIGNvbnN0IHNob3J0Y3V0c0RpcmVjdGl2ZSA9IGZ1bmN0aW9uKCk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSwgICAgICAgICAgICBcclxuICAgICAgICAgICAgY29udHJvbGxlcjogU2hvcnRjdXRDb250cm9sbGVyXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZSgncGlwU2hvcnRjdXRzJylcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBTaG9ydGN1dCcsIHNob3J0Y3V0c0RpcmVjdGl2ZSk7XHJcbn0iLCJpbXBvcnQge1xyXG4gICAgSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZVxyXG59IGZyb20gXCIuL1Nob3JjdXRzUmVnaXN0ZXJTZXJ2aWNlXCJcclxuaW1wb3J0ICB7XHJcbiAgICBLZXlib2FyZFNob3J0Y3V0LFxyXG4gICAgU2hvcnRjdXRPcHRpb24sXHJcbiAgICBLZXlib2FyZEV2ZW50XHJcbn0gZnJvbSBcIi4vS2V5Ym9hcmRTaG9ydGN1dFwiO1xyXG5cclxuZXhwb3J0IGxldCBTaG9ydGN1dHNDaGFuZ2VkRXZlbnQgPSAncGlwU2hvcnRjdXRzQ2hhbmdlZCc7XHJcblxyXG5leHBvcnQgY2xhc3MgU2hvcnRjdXRJdGVtIHtcclxuICAgIC8vIFNob3J0Y3V0IGNvbWJpbmF0aW9uXHJcbiAgICBwdWJsaWMgc2hvcnRjdXQ6IHN0cmluZztcclxuICAgIC8vIFRhcmdldCBvYmplY3QgXHJcbiAgICBwdWJsaWMgdGFyZ2V0PzogYW55O1xyXG4gICAgLy8gVGFyZ2V0IGVsZW1lbnQgYnkgSWRcclxuICAgIHB1YmxpYyB0YXJnZXRJZD86IHN0cmluZztcclxuICAgIC8vIFRhcmdldCBlbGVtZW50IGJ5IGNsYXNzIChmaXJzdGVsZW1lbnQ/PylcclxuICAgIC8vIFB1YmxpYyB0YXJnZXRDbGFzcz86IHN0cmluZztcclxuICAgIC8vIEFjY2VzcyBmdW5jdGlvblxyXG4gICAgcHVibGljIGFjY2Vzcz86IChldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IGJvb2xlYW47XHJcbiAgICAvLyBXaW5kb3cubG9jYXRpb24uaHJlZlxyXG4gICAgcHVibGljIGhyZWY/OiBzdHJpbmc7XHJcbiAgICAvLyAkbG9jYXRpb24udXJsXHJcbiAgICBwdWJsaWMgdXJsPzogc3RyaW5nO1xyXG4gICAgLy8gJHN0YXRlLmdvKHN0YXRlLCBzdGF0ZVBhcmFtcylcclxuICAgIHB1YmxpYyBzdGF0ZT86IHN0cmluZztcclxuICAgIC8vIFBhcmFtZXRlcnMgZm9yICRzdGF0ZS5nbyhzdGF0ZSwgc3RhdGVQYXJhbXMpXHJcbiAgICBwdWJsaWMgc3RhdGVQYXJhbXM/OiBhbnk7XHJcbiAgICAvLyAkcm9vdFNjb3BlLmJyb2FkY2FzdChldmVudClcclxuICAgIHB1YmxpYyBldmVudD86IHN0cmluZztcclxuICAgIC8vIENsaWNrIGNhbGxiYWNrXHJcbiAgICBwdWJsaWMga2V5cHJlc3M/OiAoZXZlbnQ6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB2b2lkO1xyXG4gICAgLy8gRGVmYXVsdCBvcHRpb25zXHJcbiAgICBwdWJsaWMgb3B0aW9ucz86IFNob3J0Y3V0T3B0aW9uOyAgICBcclxufVxyXG5cclxuLy8gZXhwb3J0IGNsYXNzIFNob3J0Y3V0SXRlbSBleHRlbmRzIFNpbXBsZVNob3J0Y3V0SXRlbSB7XHJcbi8vICAgICBwdWJsaWMgc2hvcnRjdXRzOiBTaW1wbGVTaG9ydGN1dEl0ZW1bXTtcclxuLy8gfVxyXG5cclxuZXhwb3J0IGNsYXNzIFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAvLyBHbG9iYWwgc2hvcnRjdXQgXHJcbiAgICBwdWJsaWMgZ2xvYmFsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXSA9IFtdO1xyXG4gICAgLy8gTG9jYWwgc2hvcnRjdXQgXHJcbiAgICBwdWJsaWMgbG9jYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdID0gW107XHJcbiAgICAvLyBEZWZhdWx0IG9wdGlvbnNcclxuICAgIHB1YmxpYyBkZWZhdWx0T3B0aW9uczogU2hvcnRjdXRPcHRpb24gPSBudWxsO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElTaG9ydGN1dHNTZXJ2aWNlIHtcclxuICAgIHJlYWRvbmx5IGNvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG5cclxuICAgIGdsb2JhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW107XHJcbiAgICBsb2NhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW107XHJcblxyXG4gICAgb24oZ2xvYmFsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10sIGxvY2FsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10pOiB2b2lkO1xyXG4gICAgb25Mb2NhbChsb2NhbFNob3J0Y3V0cz86IFNob3J0Y3V0SXRlbVtdKTogdm9pZDtcclxuICAgIG9mZigpOiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElTaG9ydGN1dHNQcm92aWRlciBleHRlbmRzIG5nLklTZXJ2aWNlUHJvdmlkZXIge1xyXG4gICAgY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcbiAgICBcclxuICAgIGdsb2JhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW107XHJcbiAgICBsb2NhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW107XHJcbiAgICBkZWZhdWx0T3B0aW9uczogU2hvcnRjdXRPcHRpb247XHJcbn1cclxuXHJcbmNsYXNzIFNob3J0Y3V0c1NlcnZpY2UgaW1wbGVtZW50cyBJU2hvcnRjdXRzU2VydmljZSB7XHJcbiAgICBwcml2YXRlIF9vbGRDb25maWc6IFNob3J0Y3V0c0NvbmZpZztcclxuICAgIHByaXZhdGUgX2NvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICBjb25maWc6IFNob3J0Y3V0c0NvbmZpZyxcclxuICAgICAgICBwcml2YXRlICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIFxyXG4gICAgICAgIHByaXZhdGUgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLCBcclxuICAgICAgICBwcml2YXRlICRpbmplY3RvcjogbmcuYXV0by5JSW5qZWN0b3JTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgcGlwU2hvcnRjdXRzUmVnaXN0ZXI6IElTaG9ydGN1dHNSZWdpc3RlclNlcnZpY2VcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcclxuICAgICAgICB0aGlzLl9vbGRDb25maWcgPSBfLmNsb25lRGVlcCh0aGlzLl9jb25maWcpO1xyXG5cclxuICAgICAgICAvLyBBZGQgc2hvcnRjdXRzXHJcbiAgICAgICAgdGhpcy5hZGRTaG9ydGN1dHModGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cyk7XHJcbiAgICAgICAgdGhpcy5hZGRTaG9ydGN1dHModGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzKTsgICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIC8vIERlc2NyaWJlIHByaXZhdGUgZnVuY3Rpb25zXHJcbiAgICBwcml2YXRlIHNlbmRDaGFuZ2VFdmVudCgpIHtcclxuICAgICAgICAvLyBSZW1vdmUgc2hvcnRjdXRzXHJcbiAgICAgICAgdGhpcy5yZW1vdmVTaG9ydGN1dHModGhpcy5fb2xkQ29uZmlnLmdsb2JhbFNob3J0Y3V0cyk7XHJcbiAgICAgICAgdGhpcy5yZW1vdmVTaG9ydGN1dHModGhpcy5fb2xkQ29uZmlnLmxvY2FsU2hvcnRjdXRzKTtcclxuICAgICAgICAvLyBBZGQgc2hvcnRjdXRzXHJcbiAgICAgICAgdGhpcy5hZGRTaG9ydGN1dHModGhpcy5jb25maWcuZ2xvYmFsU2hvcnRjdXRzKTtcclxuICAgICAgICB0aGlzLmFkZFNob3J0Y3V0cyh0aGlzLmNvbmZpZy5sb2NhbFNob3J0Y3V0cyk7XHJcblxyXG4gICAgICAgIHRoaXMuJHJvb3RTY29wZS4kZW1pdChTaG9ydGN1dHNDaGFuZ2VkRXZlbnQsIHRoaXMuY29uZmlnKTtcclxuICAgICAgICAvLyBTYXZlIGN1cnJlbnQgY29uZmlnIHRvIG9sZENvbmZpZ1xyXG4gICAgICAgIHRoaXMuX29sZENvbmZpZyA9IF8uY2xvbmVEZWVwKHRoaXMuY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZVNob3J0Y3V0cyhjb2xsZWN0aW9uOiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQge1xyXG4gICAgICAgIF8uZWFjaChjb2xsZWN0aW9uLCAoaykgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBpcFNob3J0Y3V0c1JlZ2lzdGVyLnJlbW92ZShrLnNob3J0Y3V0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGtleXByZXNzU2hvcnRjdXQoc2hvcmN1dDogU2hvcnRjdXRJdGVtLCBldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpIHtcclxuICAgICAgICBpZiAoc2hvcmN1dC5hY2Nlc3MgJiYgXy5pc0Z1bmN0aW9uKHNob3JjdXQuYWNjZXNzKSkge1xyXG4gICAgICAgICAgICBpZiAoIXNob3JjdXQuYWNjZXNzKGV2ZW50KSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBcclxuXHJcbiAgICAgICAgaWYgKHNob3JjdXQua2V5cHJlc3MpIHtcclxuICAgICAgICAgICAgc2hvcmN1dC5rZXlwcmVzcyhldmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzaG9yY3V0LmhyZWYpIHtcclxuICAgICAgICAgICAgdGhpcy4kd2luZG93LmxvY2F0aW9uLmhyZWYgPSBzaG9yY3V0LmhyZWY7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzaG9yY3V0LnVybCkge1xyXG4gICAgICAgICAgICB0aGlzLiRsb2NhdGlvbi51cmwoc2hvcmN1dC51cmwpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2hvcmN1dC5zdGF0ZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kaW5qZWN0b3IuaGFzKCckc3RhdGUnKSkge1xyXG4gICAgICAgICAgICAgICAgdmFyICRzdGF0ZSA9IHRoaXMuJGluamVjdG9yLmdldCgnJHN0YXRlJyk7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGVbJ2dvJ10oc2hvcmN1dC5zdGF0ZSwgc2hvcmN1dC5zdGF0ZVBhcmFtcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHNob3JjdXQuZXZlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3Qoc2hvcmN1dC5ldmVudCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIHJhaXNlIG5vdGlmaWNhdGlvblxyXG4gICAgICAgICAgICB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgncGlwU2hvcnRjdXRLZXlwcmVzcycsIHNob3JjdXQuc2hvcnRjdXQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFkZFNob3J0Y3V0cyhjb2xsZWN0aW9uOiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQge1xyXG4gICAgICAgIGxldCBnZW5lcmFsT3B0aW9uczogU2hvcnRjdXRPcHRpb24gPSB0aGlzLmNvbmZpZy5kZWZhdWx0T3B0aW9ucyA/IHRoaXMuY29uZmlnLmRlZmF1bHRPcHRpb25zIDogPFNob3J0Y3V0T3B0aW9uPnt9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIF8uZWFjaChjb2xsZWN0aW9uLCAoaykgPT4ge1xyXG4gICAgICAgICAgICBsZXQgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbiA9IGsub3B0aW9ucyA/IGsub3B0aW9ucyA6IGdlbmVyYWxPcHRpb25zO1xyXG4gICAgICAgICAgICBsZXQgdGFyZ2V0OiBhbnk7XHJcblxyXG4gICAgICAgICAgICB0YXJnZXQgPSBrLnRhcmdldCA/IGsudGFyZ2V0IDogay50YXJnZXRJZDtcclxuICAgICAgICAgICAgb3B0aW9uLlRhcmdldCA9IHRhcmdldDtcclxuICAgICAgICAgICAgLy8gUmVnaXN0cmF0aW9uIG9mIGtleWJvYXJkIHNob3J0Y3V0XHJcbiAgICAgICAgICAgIHRoaXMucGlwU2hvcnRjdXRzUmVnaXN0ZXIuYWRkKGsuc2hvcnRjdXQsIChlPzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmtleXByZXNzU2hvcnRjdXQoaywgZSk7ICAgICAgICBcclxuICAgICAgICAgICAgfSwgb3B0aW9uKTsgICAgICAgICAgICAgIFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERlc2NyaWJlIHB1YmxpYyBmdW5jdGlvbnMgXHJcbiAgICBwdWJsaWMgZ2V0IGNvbmZpZygpOiBTaG9ydGN1dHNDb25maWcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWc7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBkZWZhdWx0T3B0aW9ucygpOiBTaG9ydGN1dE9wdGlvbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5kZWZhdWx0T3B0aW9ucztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGRlZmF1bHRPcHRpb25zKHZhbHVlOiBTaG9ydGN1dE9wdGlvbikge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5kZWZhdWx0T3B0aW9ucyA9IHZhbHVlIHx8IG51bGw7XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGdsb2JhbFNob3J0Y3V0cygpOiBTaG9ydGN1dEl0ZW1bXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBnbG9iYWxTaG9ydGN1dHModmFsdWU6IFNob3J0Y3V0SXRlbVtdKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cyA9IHZhbHVlIHx8IFtdO1xyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBsb2NhbFNob3J0Y3V0cygpOiBTaG9ydGN1dEl0ZW1bXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGxvY2FsU2hvcnRjdXRzKHZhbHVlOiBTaG9ydGN1dEl0ZW1bXSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyA9IHZhbHVlIHx8IFtdO1xyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9uKGdsb2JhbFNob3J0Y3V0cz86IFNob3J0Y3V0SXRlbVtdLCBsb2NhbFNob3J0Y3V0cz86IFNob3J0Y3V0SXRlbVtdKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKGdsb2JhbFNob3J0Y3V0cyAmJiBfLmlzQXJyYXkoZ2xvYmFsU2hvcnRjdXRzKSkge1xyXG4gICAgICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gZ2xvYmFsU2hvcnRjdXRzOyAgICBcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGxvY2FsU2hvcnRjdXRzICYmIF8uaXNBcnJheShsb2NhbFNob3J0Y3V0cykpIHtcclxuICAgICAgICAgICAgdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzID0gbG9jYWxTaG9ydGN1dHM7ICAgIFxyXG4gICAgICAgIH0gICAgICAgIFxyXG5cclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbkxvY2FsKGxvY2FsU2hvcnRjdXRzPzogU2hvcnRjdXRJdGVtW10pOiB2b2lkIHtcclxuICAgICAgICBpZiAobG9jYWxTaG9ydGN1dHMgJiYgXy5pc0FycmF5KGxvY2FsU2hvcnRjdXRzKSkge1xyXG4gICAgICAgICAgICB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHMgPSBsb2NhbFNob3J0Y3V0czsgICAgXHJcbiAgICAgICAgfSAgICAgICAgXHJcblxyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9mZigpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gW107XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzID0gW107XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU2hvcnRjdXRzUHJvdmlkZXIgaW1wbGVtZW50cyBJU2hvcnRjdXRzUHJvdmlkZXIge1xyXG4gICAgcHJpdmF0ZSBfY29uZmlnOiBTaG9ydGN1dHNDb25maWcgPSBuZXcgU2hvcnRjdXRzQ29uZmlnKCk7XHJcbiAgICBwcml2YXRlIF9zZXJ2aWNlOiBTaG9ydGN1dHNTZXJ2aWNlO1xyXG5cclxuICAgIHB1YmxpYyBnZXQgY29uZmlnKCk6IFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGNvbmZpZyh2YWx1ZTogU2hvcnRjdXRzQ29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnID0gdmFsdWUgfHwgbmV3IFNob3J0Y3V0c0NvbmZpZygpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZGVmYXVsdE9wdGlvbnMoKTogU2hvcnRjdXRPcHRpb24ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBkZWZhdWx0T3B0aW9ucyh2YWx1ZTogU2hvcnRjdXRPcHRpb24pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnMgPSB2YWx1ZSB8fCBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZ2xvYmFsU2hvcnRjdXRzKCk6IFNob3J0Y3V0SXRlbVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGdsb2JhbFNob3J0Y3V0cyh2YWx1ZTogU2hvcnRjdXRJdGVtW10pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gdmFsdWUgfHwgW107XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBsb2NhbFNob3J0Y3V0cygpOiBTaG9ydGN1dEl0ZW1bXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGxvY2FsU2hvcnRjdXRzKHZhbHVlOiBTaG9ydGN1dEl0ZW1bXSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyA9IHZhbHVlIHx8IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyAkZ2V0KFxyXG4gICAgICAgICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLCBcclxuICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSwgXHJcbiAgICAgICAgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLCBcclxuICAgICAgICAkaW5qZWN0b3I6IG5nLmF1dG8uSUluamVjdG9yU2VydmljZSxcclxuICAgICAgICBwaXBTaG9ydGN1dHNSZWdpc3RlcjogSVNob3J0Y3V0c1JlZ2lzdGVyU2VydmljZVxyXG4gICAgKSB7XHJcbiAgICAgICAgXCJuZ0luamVjdFwiO1xyXG5jb25zb2xlLmxvZygndGhpcy5fY29uZmlnJywgdGhpcy5fY29uZmlnKTtcclxuICAgICAgICBpZiAodGhpcy5fc2VydmljZSA9PSBudWxsKVxyXG4gICAgICAgICAgICB0aGlzLl9zZXJ2aWNlID0gbmV3IFNob3J0Y3V0c1NlcnZpY2UodGhpcy5fY29uZmlnLCAkcm9vdFNjb3BlLCAkd2luZG93LCAkbG9jYXRpb24sICRpbmplY3RvciwgcGlwU2hvcnRjdXRzUmVnaXN0ZXIpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9zZXJ2aWNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5hbmd1bGFyXHJcbiAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgLnByb3ZpZGVyKCdwaXBTaG9ydGN1dHMnLCBTaG9ydGN1dHNQcm92aWRlcik7XHJcblxyXG4iLCJhbmd1bGFyLm1vZHVsZSgncGlwU2hvcnRjdXRzJywgWyduZ01hdGVyaWFsJywgJ3VpLnJvdXRlciddKTtcclxuXHJcbmltcG9ydCAnLi9TaG9yY3V0c1JlZ2lzdGVyU2VydmljZSc7XHJcbmltcG9ydCAnLi9TaG9ydGN1dHNTZXJ2aWNlJztcclxuaW1wb3J0ICcuL1Nob3J0Y3V0RGlyZWN0aXZlJztcclxuXHJcbmV4cG9ydCAqIGZyb20gJy4vU2hvcnRjdXRzU2VydmljZSc7XHJcbmV4cG9ydCAqIGZyb20gJy4vU2hvcmN1dHNSZWdpc3RlclNlcnZpY2UnOyIsIntcclxuXHJcbiAgICBpbnRlcmZhY2UgU2VsZWN0ZWRBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIHBpcFNlbGVjdGVkOiBhbnk7XHJcbiAgICAgICAgcGlwU2VsZWN0ZWRJZDogYW55O1xyXG4gICAgICAgIHBpcFNlbGVjdDogYW55O1xyXG4gICAgICAgIHBpcEVudGVyU3BhY2VQcmVzczogYW55O1xyXG4gICAgICAgIHBpcE5vU2Nyb2xsOiBhbnk7XHJcbiAgICAgICAgcGlwU2tpcEhpZGRlbjogYW55O1xyXG4gICAgICAgIHBpcFRyZWVMaXN0OiBhbnk7XHJcbiAgICAgICAgcGlwU2VsZWN0ZWRXYXRjaDogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIFNlbGVjdGVkTGluayB7XHJcbiAgICAgICAgcHJpdmF0ZSBpbmRleEdldHRlcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgaW5kZXhTZXR0ZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIGlkU2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBpZEdldHRlcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgY2hhbmdlR2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBlbnRlclNwYWNlR2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBub1Njcm9sbDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgbW9kaWZpZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIGNsYXNzTmFtZTogYW55O1xyXG4gICAgICAgIHByaXZhdGUgc2VsZWN0ZWRJbmRleDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudEVsZW1lbnRUYWJpbmV4OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBwaXBTZWxlY3RlZFdhdGNoOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBpc1Njcm9sbGVkOiBhbnk7XHJcbiAgICAgICAgLy8gVmFyaWFibGVzIGZvciB0b3VjaCBmdW5jdGlvbnNcclxuICAgICAgICBwcml2YXRlIHRvdWNoU3RhcnRYOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSB0b3VjaFN0YXJ0WTogYW55O1xyXG4gICAgICAgIHByaXZhdGUgdHJhY2tpbmdDbGljazogYW55O1xyXG4gICAgICAgIHByaXZhdGUgdHJhY2tpbmdDbGlja1N0YXJ0OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSB0YXJnZXRFbGVtZW50OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBsYXN0Q2xpY2tUaW1lOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBjYW5jZWxOZXh0Q2xpY2s6IGFueTtcclxuICAgICAgICAvLyBDb25zdGFudHMgZm9yIHRvdWNoIGZ1bmN0aW9uc1xyXG4gICAgICAgIHByaXZhdGUgdG91Y2hCb3VuZGFyeTogbnVtYmVyID0gMTA7XHJcbiAgICAgICAgcHJpdmF0ZSB0YXBkZWxheTogbnVtYmVyID0gMjAwO1xyXG4gICAgICAgIHByaXZhdGUgdGFwVGltZW91dDogbnVtYmVyID0gNzAwO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgJHBhcnNlOiBuZy5JUGFyc2VTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRtZENvbnN0YW50OiBhbnksXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICBwcml2YXRlICRhdHRyczogU2VsZWN0ZWRBdHRyaWJ1dGVzXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5kZXhHZXR0ZXIgPSAkYXR0cnMucGlwU2VsZWN0ZWQgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdGVkKSA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuaW5kZXhTZXR0ZXIgPSB0aGlzLmluZGV4R2V0dGVyID8gdGhpcy5pbmRleEdldHRlci5hc3NpZ24gOiBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmlkR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdGVkSWQgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdGVkSWQpIDogbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5pZFNldHRlciA9IHRoaXMuaWRHZXR0ZXIgPyB0aGlzLmlkR2V0dGVyLmFzc2lnbiA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0KSA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuZW50ZXJTcGFjZUdldHRlciA9ICRhdHRycy5waXBFbnRlclNwYWNlUHJlc3MgPyAkcGFyc2UoJGF0dHJzLnBpcEVudGVyU3BhY2VQcmVzcykgOiBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLm5vU2Nyb2xsID0gJGF0dHJzLnBpcE5vU2Nyb2xsO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVyID0gJGF0dHJzLnBpcFNraXBIaWRkZW4gPyAnOnZpc2libGUnIDogJyc7XHJcbiAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJGF0dHJzLnBpcFRyZWVMaXN0ID8gJy5waXAtc2VsZWN0YWJsZS10cmVlJyA6ICcucGlwLXNlbGVjdGFibGUnO1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSB0aGlzLmluZGV4R2V0dGVyKCRzY29wZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEVsZW1lbnRUYWJpbmV4ID0gJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnKTtcclxuICAgICAgICAgICAgdGhpcy5waXBTZWxlY3RlZFdhdGNoID0gJGF0dHJzLnBpcFNlbGVjdGVkV2F0Y2g7XHJcbiAgICAgICAgICAgIHRoaXMuaXNTY3JvbGxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCB0aGlzLmN1cnJlbnRFbGVtZW50VGFiaW5leCB8fCAwKTtcclxuXHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCdjbGljaycsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25DbGlja0V2ZW50KGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCd0b3VjaHN0YXJ0JywgdGhpcy5jbGFzc05hbWUsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vblRvdWNoU3RhcnQoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNobW92ZScsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Ub3VjaE1vdmUoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNoZW5kJywgdGhpcy5jbGFzc05hbWUsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vblRvdWNoRW5kKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCd0b3VjaGNhbmNlbCcsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Ub3VjaENhbmNlbChldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkZWxlbWVudC5vbigna2V5ZG93bicsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbktleURvd24oZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2ZvY3VzaW4nLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Gb2N1c0luKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c291dCcsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkZvY3VzT3V0KGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBXYXRjaCBzZWxlY3RlZCBpdGVtIGluZGV4XHJcbiAgICAgICAgICAgIGlmICghJGF0dHJzLnBpcFRyZWVMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKHRoaXMuaW5kZXhHZXR0ZXIsIChuZXdTZWxlY3RlZEluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4OiBuZXdTZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2godGhpcy5pZEdldHRlciwgKG5ld1NlbGVjdGVkSWQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtSWQ6IG5ld1NlbGVjdGVkSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFdhdGNoIHJlc3luYyBzZWxlY3Rpb25cclxuICAgICAgICAgICAgaWYgKHRoaXMucGlwU2VsZWN0ZWRXYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCh0aGlzLnBpcFNlbGVjdGVkV2F0Y2gsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBEZWxheSB1cGRhdGUgdG8gYWxsb3cgbmctcmVwZWF0IHRvIHVwZGF0ZSBET01cclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IHRoaXMuaW5kZXhHZXR0ZXIoJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogdGhpcy5zZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gU2VsZWN0IGl0ZW0gZGVmaW5lZCBieSBpbmRleFxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgaXRlbUluZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICBpdGVtczogJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHNlbGVjdEl0ZW0oaXRlbVBhcmFtcykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc1Njcm9sbGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIGxldCBpdGVtSW5kZXggPSBpdGVtUGFyYW1zLml0ZW1JbmRleCxcclxuICAgICAgICAgICAgICAgIGl0ZW1JZCA9IGl0ZW1QYXJhbXMuaXRlbUlkLFxyXG4gICAgICAgICAgICAgICAgaXRlbXMgPSBpdGVtUGFyYW1zLml0ZW1zIHx8IHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSArIHRoaXMubW9kaWZpZXIpLFxyXG4gICAgICAgICAgICAgICAgaXRlbXNMZW5ndGggPSBpdGVtcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICBpdGVtID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtUGFyYW1zLml0ZW0pIHJldHVybiBpdGVtUGFyYW1zLml0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA9PT0gdW5kZWZpbmVkICYmIGl0ZW1JbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4ID0gaXRlbXMuaW5kZXgoaXRlbXMuZmlsdGVyKCdbcGlwLWlkPScgKyBpdGVtSWQgKyAnXScpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA+PSAwICYmIGl0ZW1JbmRleCA8IGl0ZW1zTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtc1tpdGVtSW5kZXhdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcmFpc2VFdmVudCA9IGl0ZW1QYXJhbXMucmFpc2VFdmVudDtcclxuICAgICAgICAgICAgICAgIGl0ZW0gPSBpdGVtKCk7XHJcbiAgICAgICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmZpbmQodGhpcy5jbGFzc05hbWUpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCBtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICBpdGVtID0gPGFueT5hbmd1bGFyLmVsZW1lbnQoaXRlbSlcclxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NlbGVjdGVkIG1kLWZvY3VzZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vU2Nyb2xsKSB0aGlzLnNjcm9sbFRvSXRlbShpdGVtKTtcclxuICAgICAgICAgICAgICAgIGlmIChyYWlzZUV2ZW50KSB0aGlzLmRlZmluZVNlbGVjdGVkSW5kZXgoaXRlbXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBkZWZpbmVTZWxlY3RlZEluZGV4KGl0ZW1zKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9sZFNlbGVjdGVkSW5kZXggPSB0aGlzLnNlbGVjdGVkSW5kZXg7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgaXRlbXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJChpdGVtc1tpbmRleF0pLmhhc0NsYXNzKCdzZWxlY3RlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gaW5kZXg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBFeGVjdXRlIGNhbGxiYWNrIHRvIG5vdGlmeSBhYm91dCBpdGVtIHNlbGVjdFxyXG4gICAgICAgICAgICBpZiAob2xkU2VsZWN0ZWRJbmRleCAhPSB0aGlzLnNlbGVjdGVkSW5kZXggJiYgdGhpcy5zZWxlY3RlZEluZGV4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuJGFwcGx5KHVwZGF0ZUluZGV4KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRhcHBseShvblNlbGVjdCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZUluZGV4KCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW1zW3RoaXMuc2VsZWN0ZWRJbmRleF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBzZWxlY3RlZEl0ZW0uYXR0cigncGlwLWlkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5kZXhTZXR0ZXIpIHRoaXMuaW5kZXhTZXR0ZXIodGhpcy4kc2NvcGUsIHRoaXMuc2VsZWN0ZWRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZFNldHRlcikgdGhpcy5pZFNldHRlcih0aGlzLiRzY29wZSwgc2VsZWN0ZWRJZCk7XHJcbiAgICAgICAgICAgICAgICBvblNlbGVjdCgpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gb25TZWxlY3QoKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSBhbmd1bGFyLmVsZW1lbnQoaXRlbXNbdGhpcy5zZWxlY3RlZEluZGV4XSksXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJZCA9IHNlbGVjdGVkSXRlbS5hdHRyKCdwaXAtaWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jaGFuZ2VHZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZUdldHRlcih0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGhpcy4kZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IHNlbGVjdGVkSXRlbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZWN0ZWRJZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0luZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJbmRleDogb2xkU2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcml2YXRlIHNjcm9sbFRvSXRlbSgkaXRlbSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ub1Njcm9sbCB8fCAhJGl0ZW0ub2Zmc2V0KCkpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJUb3AgPSB0aGlzLiRlbGVtZW50Lm9mZnNldCgpLnRvcCxcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IHRoaXMuJGVsZW1lbnQuaGVpZ2h0KCksXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBjb250YWluZXJUb3AgKyBjb250YWluZXJIZWlnaHQsXHJcbiAgICAgICAgICAgICAgICBpdGVtVG9wID0gJGl0ZW0ub2Zmc2V0KCkudG9wLFxyXG4gICAgICAgICAgICAgICAgaXRlbUhlaWdodCA9ICRpdGVtLm91dGVySGVpZ2h0KHRydWUpLFxyXG4gICAgICAgICAgICAgICAgaXRlbUJvdHRvbSA9IGl0ZW1Ub3AgKyBpdGVtSGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsVG9wID0gdGhpcy4kZWxlbWVudC5zY3JvbGxUb3AoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaXNTY3JvbGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc1Njcm9sbGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoY29udGFpbmVyVG9wID4gaXRlbVRvcCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgaXRlbVRvcCAtIGNvbnRhaW5lclRvcCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyQm90dG9tIDwgaXRlbUJvdHRvbSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgaXRlbUJvdHRvbSAtIGNvbnRhaW5lckJvdHRvbSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcml2YXRlIGdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXZlbnRUYXJnZXQpIHtcclxuICAgICAgICAgICAgLy8gT24gc29tZSBvbGRlciBicm93c2VycyB0aGUgZXZlbnQgdGFyZ2V0IG1heSBiZSBhIHRleHQgbm9kZS5cclxuICAgICAgICAgICAgaWYgKGV2ZW50VGFyZ2V0Lm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50VGFyZ2V0LnBhcmVudE5vZGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBldmVudFRhcmdldDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcml2YXRlIHRvdWNoSGFzTW92ZWQoZXZlbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgdG91Y2ggPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXSxcclxuICAgICAgICAgICAgICAgIGJvdW5kYXJ5ID0gdGhpcy50b3VjaEJvdW5kYXJ5OyAvLyBUb3VjaG1vdmUgYm91bmRhcnksIGJleW9uZCB3aGljaCBhIGNsaWNrIHdpbGwgYmUgY2FuY2VsbGVkLlxyXG5cclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHRvdWNoLnBhZ2VYIC0gdGhpcy50b3VjaFN0YXJ0WCkgPiBib3VuZGFyeSB8fCBNYXRoLmFicyh0b3VjaC5wYWdlWSAtIHRoaXMudG91Y2hTdGFydFkpID4gYm91bmRhcnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkNsaWNrRXZlbnQoZXZlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgIGl0ZW06IGV2ZW50LmN1cnJlbnRUYXJnZXQsXHJcbiAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvblRvdWNoU3RhcnQoZXZlbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgZXYgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICBpZiAoZXZbJ3RhcmdldFRvdWNoZXMnXS5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCB0YXJnZXRFbGVtZW50ID0gdGhpcy5nZXRUYXJnZXRFbGVtZW50RnJvbUV2ZW50VGFyZ2V0KGV2LnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICB0b3VjaCA9IGV2Wyd0YXJnZXRUb3VjaGVzJ11bMF07XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2sgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2tTdGFydCA9IGV2LnRpbWVTdGFtcDtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRFbGVtZW50ID0gdGFyZ2V0RWxlbWVudDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudG91Y2hTdGFydFggPSB0b3VjaC5wYWdlWDtcclxuICAgICAgICAgICAgdGhpcy50b3VjaFN0YXJ0WSA9IHRvdWNoLnBhZ2VZO1xyXG5cclxuICAgICAgICAgICAgLyppZiAoKGV2LnRpbWVTdGFtcCAtIHRoaXMubGFzdENsaWNrVGltZSkgPCB0aGlzLnRhcGRlbGF5KSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgfSovXHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Ub3VjaE1vdmUoZXZlbnQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnRyYWNraW5nQ2xpY2spIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGV2ID0gZXZlbnQub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgLy8gSWYgdGhlIHRvdWNoIGhhcyBtb3ZlZCwgY2FuY2VsIHRoZSBjbGljayB0cmFja2luZ1xyXG4gICAgICAgICAgICBpZiAodGhpcy50YXJnZXRFbGVtZW50ICE9PSB0aGlzLmdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXYudGFyZ2V0KSB8fCB0aGlzLnRvdWNoSGFzTW92ZWQoZXYpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0RWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvblRvdWNoRW5kKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGxldCBmb3JFbGVtZW50LCBuZXdUcmFja2luZ0NsaWNrU3RhcnQsIHRhcmdldFRhZ05hbWUsIHNjcm9sbFBhcmVudCwgdG91Y2gsIG5ld3RhcmdldEVsZW1lbnQgPSB0aGlzLnRhcmdldEVsZW1lbnQ7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMudHJhY2tpbmdDbGljaykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgZXYgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICAvLyBQcmV2ZW50IHBoYW50b20gY2xpY2tzIG9uIGZhc3QgZG91YmxlLXRhcCBcclxuICAgICAgICAgICAgaWYgKChldi50aW1lU3RhbXAgLSB0aGlzLmxhc3RDbGlja1RpbWUpIDwgdGhpcy50YXBkZWxheSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxOZXh0Q2xpY2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICgoZXYudGltZVN0YW1wIC0gdGhpcy50cmFja2luZ0NsaWNrU3RhcnQpID4gdGhpcy50YXBUaW1lb3V0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gUmVzZXQgdG8gcHJldmVudCB3cm9uZyBjbGljayBjYW5jZWwgb24gaW5wdXQgXHJcbiAgICAgICAgICAgIHRoaXMuY2FuY2VsTmV4dENsaWNrID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxhc3RDbGlja1RpbWUgPSBldmVudC50aW1lU3RhbXA7XHJcblxyXG4gICAgICAgICAgICBuZXdUcmFja2luZ0NsaWNrU3RhcnQgPSB0aGlzLnRyYWNraW5nQ2xpY2tTdGFydDtcclxuICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tpbmdDbGlja1N0YXJ0ID0gMDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICBpdGVtOiBldmVudC5jdXJyZW50VGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgcmFpc2VFdmVudDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Ub3VjaENhbmNlbChldmVudCkge1xyXG4gICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXRFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25LZXlEb3duKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBrZXlDb2RlID0gZXZlbnQud2hpY2ggfHwgZXZlbnQua2V5Q29kZTtcclxuXHJcbiAgICAgICAgICAgIC8vIENoZWNrIGNvbnRyb2wga2V5Q29kZVxyXG4gICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkVOVEVSIHx8IGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5TUEFDRSkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmVudGVyU3BhY2VHZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVudGVyU3BhY2VHZXR0ZXIodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHRoaXMuJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogdGhpcy5zZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTogdGhpcy4kZWxlbWVudC5maW5kKCcuc2VsZWN0ZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgaWYgKGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5MRUZUX0FSUk9XIHx8IGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8IGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIEdldCBuZXh0IHNlbGVjdGFibGUgY29udHJvbCBpbmRleFxyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQodGhpcy5jbGFzc05hbWUgKyB0aGlzLm1vZGlmaWVyKSxcclxuICAgICAgICAgICAgICAgICAgICBpbmMgPSAoa2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8IGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSA/IDEgOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICBuZXdTZWxlY3RlZEluZGV4ID0gdGhpcy5zZWxlY3RlZEluZGV4ICsgaW5jO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFNldCBuZXh0IGNvbnRyb2wgYXMgc2VsZWN0ZWRcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4OiBuZXdTZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiBpdGVtcyxcclxuICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkZvY3VzSW4oZXZlbnQpIHtcclxuICAgICAgICAgICAgLy8gQ2hvb3NlIHNlbGVjdGVkIGVsZW1lbnRcclxuICAgICAgICAgICAgbGV0IGl0ZW1zLFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtID0gdGhpcy4kZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lICsgJy5zZWxlY3RlZCcpO1xyXG5cclxuICAgICAgICAgICAgc2VsZWN0ZWRJdGVtLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbm90IHNlbGVjdGVkIGVsZW1lbnRzIHRoZW4gcGljayB0aGUgZmlyc3Qgb25lXHJcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEl0ZW0ubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSB0aGlzLmluZGV4R2V0dGVyKHRoaXMuJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgIGl0ZW1zID0gdGhpcy4kZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lICsgdGhpcy5tb2RpZmllcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogdGhpcy5zZWxlY3RlZEluZGV4IHx8IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXM6IGl0ZW1zLFxyXG4gICAgICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRm9jdXNPdXQoZXZlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lICsgJy5tZC1mb2N1c2VkJyArIHRoaXMubW9kaWZpZXIpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IFNlbGVjdGVkID0gZnVuY3Rpb24gKFxyXG4gICAgICAgICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICAkbWRDb25zdGFudDogYW55LFxyXG4gICAgICAgICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2VcclxuICAgICk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAgICAgJGF0dHJzOiBTZWxlY3RlZEF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgU2VsZWN0ZWRMaW5rKCRwYXJzZSwgJG1kQ29uc3RhbnQsICR0aW1lb3V0LCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKFwicGlwU2VsZWN0ZWRcIiwgW10pXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwU2VsZWN0ZWQnLCBTZWxlY3RlZCk7XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XHJcbntcclxuICAgIGludGVyZmFjZSBVbnNhdmVkQ2hhbmdlc1Njb3BlIGV4dGVuZHMgbmcuSVNjb3BlIHtcclxuICAgICAgICB1bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZTogRnVuY3Rpb247XHJcbiAgICAgICAgdW5zYXZlZENoYW5nZXNNZXNzYWdlOiBzdHJpbmc7XHJcbiAgICAgICAgY2FuY2VsTGVhdmU6IEZ1bmN0aW9uO1xyXG4gICAgICAgIGFmdGVyTGVhdmU6IEZ1bmN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIFVuc2F2ZWRDaGFuZ2VzTGluayB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgICRzY29wZTogVW5zYXZlZENoYW5nZXNTY29wZSxcclxuICAgICAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgJHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUudW5zYXZlZENoYW5nZXNBdmFpbGFibGUoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdW5iaW5kRnVuYyA9ICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlKCkgJiYgISR3aW5kb3cuY29uZmlybSgkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbigkc2NvcGUuY2FuY2VsTGVhdmUpICYmICRzY29wZS5jYW5jZWxMZWF2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbigkc2NvcGUuYWZ0ZXJMZWF2ZSkgJiYgJHNjb3BlLmFmdGVyTGVhdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICR3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdW5iaW5kRnVuYygpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgVW5zYXZlZENoYW5nZXMgPSBmdW5jdGlvbiAoJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0FFJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlJyxcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzTWVzc2FnZTogJ0BwaXBVbnNhdmVkQ2hhbmdlc01lc3NhZ2UnLFxyXG4gICAgICAgICAgICAgICAgYWZ0ZXJMZWF2ZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0FmdGVyTGVhdmUnLFxyXG4gICAgICAgICAgICAgICAgY2FuY2VsTGVhdmU6ICcmcGlwVW5zYXZlZENoYW5nZXNDYW5jZWxMZWF2ZSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZTogVW5zYXZlZENoYW5nZXNTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgbmV3IFVuc2F2ZWRDaGFuZ2VzTGluaygkc2NvcGUsICR3aW5kb3cpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZShcInBpcFVuc2F2ZWRDaGFuZ2VzXCIsIFtdKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoXCJwaXBVbnNhdmVkQ2hhbmdlc1wiLCBVbnNhdmVkQ2hhbmdlcyk7XHJcbn0iXX0=