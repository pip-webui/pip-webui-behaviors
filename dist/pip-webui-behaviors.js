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
    angular
        .module("pipDraggable")
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
    angular
        .module("pipDraggable")
        .directive('pipDrag', Drag);
}
},{}],3:[function(require,module,exports){
"use strict";
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
angular
    .module("pipDraggable")
    .service('pipDraggable', DraggableService);
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
    angular
        .module("pipDraggable")
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
    angular
        .module("pipDraggable")
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
            this.onFocusClass = this.$scope.pipFocusedClass ? this.$scope.pipFocusedClass() : '';
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
                $(target).addClass(_this.onFocusClass);
                if (!_this.$scope.pipFocusedOpacity || !_this.$scope.pipFocusedOpacity()) {
                    _this.color = $(target).css('backgroundColor');
                    _this.oldBackgroundColor = _this.color;
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
                $(target).removeClass(_this.onFocusClass);
                if (!_this.$scope.pipFocusedOpacity || !_this.$scope.pipFocusedOpacity()) {
                    $(target).css('backgroundColor', _this.oldBackgroundColor);
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
                pipFocusedClass: '&?',
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
    angular
        .module("pipFocused", [])
        .directive('pipFocused', Focused);
}
},{}],8:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
require("./unsaved_changes/unsavedChanges");
require("./shortcuts/index");
require("./focused/focused");
require("./draggable/index");
require("./selected/selected");
require("./infinite_scroll/infiniteScroll");
angular.module('pipBehaviors', [
    'pipFocused',
    'pipSelected',
    'pipInfiniteScroll',
    'pipUnsavedChanges',
    'pipDraggable',
    'pipShortcuts'
]);
__export(require("./shortcuts/index"));
},{"./draggable/index":6,"./focused/focused":7,"./infinite_scroll/infiniteScroll":9,"./selected/selected":10,"./shortcuts/index":16,"./unsaved_changes/unsavedChanges":17}],9:[function(require,module,exports){
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
    angular
        .module("pipInfiniteScroll", [])
        .directive('pipInfiniteScroll', InfiniteScroll);
}
},{}],10:[function(require,module,exports){
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
            var _this = this;
            var oldSelectedIndex = this.selectedIndex;
            this.selectedIndex = -1;
            for (var index = 0; index < items.length; index++) {
                if ($(items[index]).hasClass('selected')) {
                    this.selectedIndex = index;
                    break;
                }
            }
            var updateIndex = function () {
                var selectedItem = angular.element(items[_this.selectedIndex]), selectedId = selectedItem.attr('pip-id');
                if (_this.indexSetter)
                    _this.indexSetter(_this.$scope, _this.selectedIndex);
                if (_this.idSetter)
                    _this.idSetter(_this.$scope, selectedId);
                onSelect();
            };
            var onSelect = function () {
                var selectedItem = angular.element(items[_this.selectedIndex]), selectedId = selectedItem.attr('pip-id');
                if (_this.changeGetter) {
                    _this.changeGetter(_this.$scope, {
                        $event: {
                            target: _this.$element,
                            item: selectedItem,
                            index: _this.selectedIndex,
                            id: selectedId,
                            newIndex: _this.selectedIndex,
                            oldIndex: oldSelectedIndex
                        }
                    });
                }
            };
            if (oldSelectedIndex != this.selectedIndex && this.selectedIndex !== -1) {
                this.$scope.$apply(function () { updateIndex(); });
            }
            else {
                this.$scope.$apply(function () { onSelect(); });
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
    angular
        .module("pipSelected", [])
        .directive('pipSelected', Selected);
}
},{}],11:[function(require,module,exports){
"use strict";
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
},{}],12:[function(require,module,exports){
"use strict";
var KeyboardEvent = (function () {
    function KeyboardEvent() {
    }
    return KeyboardEvent;
}());
KeyboardEvent.Keydown = 'keydown';
KeyboardEvent.Keyup = 'keyup';
KeyboardEvent.Keypress = 'keypress';
exports.KeyboardEvent = KeyboardEvent;
var ShortcutOptions = (function () {
    function ShortcutOptions() {
    }
    return ShortcutOptions;
}());
exports.ShortcutOptions = ShortcutOptions;
var Shortcut = (function () {
    Shortcut.$inject = ['element', 'shorcutCombination', 'option', 'callback'];
    function Shortcut(element, shorcutCombination, option, callback) {
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
    return Shortcut;
}());
exports.Shortcut = Shortcut;
},{}],13:[function(require,module,exports){
"use strict";
var Shortcut_1 = require("./Shortcut");
var ShortcutBindingService = (function () {
    ShortcutBindingService.$inject = ['$log', 'option'];
    function ShortcutBindingService($log, option) {
        "ngInject";
        this._shortcuts = {};
        this._log = $log;
        this._defaultOption = option ? _.defaults(option, this.getDefaultOption()) : this.getDefaultOption();
    }
    ShortcutBindingService.prototype.getDefaultOption = function () {
        var defaultOption = {
            Type: Shortcut_1.KeyboardEvent.Keydown,
            Propagate: false,
            DisableInInput: false,
            Target: document,
            Keycode: null
        };
        return defaultOption;
    };
    Object.defineProperty(ShortcutBindingService.prototype, "shortcuts", {
        get: function () {
            return this._shortcuts;
        },
        enumerable: true,
        configurable: true
    });
    ShortcutBindingService.prototype.add = function (shortcut, callback, option) {
        this.remove(shortcut);
        var shortcutOption = option ? _.defaults(option, this._defaultOption) : this._defaultOption;
        var shortcutCombination = shortcut.toLowerCase();
        var element = shortcutOption.Target;
        if (typeof shortcutOption.Target == 'string') {
            element = document.getElementById(shortcutOption.Target);
        }
        else {
            element = shortcutOption.Target;
        }
        if (!element) {
            this._log.error('Register shortcut: element undentified!');
            return;
        }
        if (!shortcutCombination) {
            this._log.error('Register shortcut: shortcut combination undentified!');
            return;
        }
        if (!callback) {
            this._log.error('Register shortcut: shorcut callback undentified!');
            return;
        }
        var newKeyboardShortcut = new Shortcut_1.Shortcut(element, shortcutCombination, shortcutOption, callback);
        this._shortcuts[shortcutCombination] = newKeyboardShortcut;
        if (element.addEventListener) {
            element.addEventListener(shortcutOption.Type, newKeyboardShortcut.eventCallback, false);
        }
        else if (element.attachEvent) {
            element.attachEvent('on' + shortcutOption.Type, newKeyboardShortcut.eventCallback);
        }
        else {
            element.on(shortcutOption.Type, newKeyboardShortcut.eventCallback);
        }
    };
    ShortcutBindingService.prototype.remove = function (shorcut) {
        var shortcutCombination = shorcut.toLowerCase();
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
    return ShortcutBindingService;
}());
exports.ShortcutBindingService = ShortcutBindingService;
var ShortcutBindingProvider = (function () {
    function ShortcutBindingProvider() {
    }
    Object.defineProperty(ShortcutBindingProvider.prototype, "option", {
        get: function () {
            return this._option;
        },
        set: function (value) {
            this._option = value || new Shortcut_1.ShortcutOptions();
        },
        enumerable: true,
        configurable: true
    });
    ShortcutBindingProvider.prototype.$get = ['$log', function ($log) {
        "ngInject";
        if (this._service == null)
            this._service = new ShortcutBindingService($log, this._option);
        return this._service;
    }];
    return ShortcutBindingProvider;
}());
angular
    .module('pipShortcuts')
    .provider('pipShortcutBinding', ShortcutBindingProvider);
},{"./Shortcut":12}],14:[function(require,module,exports){
"use strict";
var ShortcutController = (function () {
    ShortcutController.$inject = ['$element', '$attrs', '$scope', '$log', '$parse', 'pipShortcutBinding'];
    function ShortcutController($element, $attrs, $scope, $log, $parse, pipShortcutBinding) {
        "ngInject";
        var _this = this;
        if ($attrs.pipShortcutAction) {
            this.actionShortcuts = $parse($attrs.pipShortcutAction);
            this.actionShortcuts($scope, { $event: {} });
        }
        else {
            $log.error('Shortcut action does not set.');
            return;
        }
        if ($attrs.pipShortcutName && _.isString($attrs.pipShortcutName)) {
            this.nameShortcuts = $attrs.pipShortcutName;
        }
        else {
            $log.error('Shortcut name does not set.');
            return;
        }
        this.options = $attrs.pipShorcutOptions ? $attrs.pipShorcutOptions : {};
        this.options.Target = $element;
        pipShortcutBinding.add(this.nameShortcuts, function (e) {
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
},{}],15:[function(require,module,exports){
"use strict";
var IShortcutsService_1 = require("./IShortcutsService");
exports.ShortcutsChangedEvent = 'pipShortcutsChanged';
var ShortcutsService = (function () {
    function ShortcutsService(config, $rootScope, $window, $location, $injector, pipShortcutBinding) {
        this.$rootScope = $rootScope;
        this.$window = $window;
        this.$location = $location;
        this.$injector = $injector;
        this.pipShortcutBinding = pipShortcutBinding;
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
            _this.pipShortcutBinding.remove(k.shortcut);
        });
    };
    ShortcutsService.prototype.keypressShortcut = function (item, event) {
        if (item.access && _.isFunction(item.access)) {
            if (!item.access(event)) {
                return;
            }
        }
        if (item.keypress) {
            item.keypress(event);
            return;
        }
        if (item.href) {
            this.$window.location.href = item.href;
            return;
        }
        if (item.url) {
            this.$location.url(item.url);
            return;
        }
        if (item.state) {
            if (this.$injector.has('$state')) {
                var $state = this.$injector.get('$state');
                $state['go'](item.state, item.stateParams);
            }
            return;
        }
        if (item.event) {
            this.$rootScope.$broadcast(item.event);
        }
        else {
            this.$rootScope.$broadcast('pipShortcutKeypress', item.shortcut);
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
            _this.pipShortcutBinding.add(k.shortcut, function (e) {
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
    return ShortcutsService;
}());
var ShortcutsProvider = (function () {
    function ShortcutsProvider() {
        this._config = new IShortcutsService_1.ShortcutsConfig();
    }
    Object.defineProperty(ShortcutsProvider.prototype, "config", {
        get: function () {
            return this._config;
        },
        set: function (value) {
            this._config = value || new IShortcutsService_1.ShortcutsConfig();
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
    ShortcutsProvider.prototype.$get = ['$rootScope', '$window', '$location', '$injector', 'pipShortcutBinding', function ($rootScope, $window, $location, $injector, pipShortcutBinding) {
        "ngInject";
        if (this._service == null)
            this._service = new ShortcutsService(this._config, $rootScope, $window, $location, $injector, pipShortcutBinding);
        return this._service;
    }];
    return ShortcutsProvider;
}());
angular
    .module('pipShortcuts')
    .provider('pipShortcuts', ShortcutsProvider);
},{"./IShortcutsService":11}],16:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
angular.module('pipShortcuts', ['ngMaterial', 'ui.router']);
require("./ShortcutBindingService");
require("./ShortcutsService");
require("./ShortcutDirective");
__export(require("./IShortcutsService"));
__export(require("./ShortcutsService"));
__export(require("./ShortcutBindingService"));
},{"./IShortcutsService":11,"./ShortcutBindingService":13,"./ShortcutDirective":14,"./ShortcutsService":15}],17:[function(require,module,exports){
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
    angular
        .module("pipUnsavedChanges", [])
        .directive("pipUnsavedChanges", UnsavedChanges);
}
},{}]},{},[8])(8)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZHJhZ2dhYmxlL0NhbmNlbERyYWcudHMiLCJzcmMvZHJhZ2dhYmxlL0RyYWcudHMiLCJzcmMvZHJhZ2dhYmxlL0RyYWdnYWJsZVNlcnZpY2UudHMiLCJzcmMvZHJhZ2dhYmxlL0Ryb3AudHMiLCJzcmMvZHJhZ2dhYmxlL1ByZXZlbnREcmFnLnRzIiwic3JjL2RyYWdnYWJsZS9pbmRleC50cyIsInNyYy9mb2N1c2VkL2ZvY3VzZWQudHMiLCJzcmMvaW5kZXgudHMiLCJzcmMvaW5maW5pdGVfc2Nyb2xsL2luZmluaXRlU2Nyb2xsLnRzIiwic3JjL3NlbGVjdGVkL3NlbGVjdGVkLnRzIiwic3JjL3Nob3J0Y3V0cy9JU2hvcnRjdXRzU2VydmljZS50cyIsInNyYy9zaG9ydGN1dHMvU2hvcnRjdXQudHMiLCJzcmMvc2hvcnRjdXRzL1Nob3J0Y3V0QmluZGluZ1NlcnZpY2UudHMiLCJzcmMvc2hvcnRjdXRzL1Nob3J0Y3V0RGlyZWN0aXZlLnRzIiwic3JjL3Nob3J0Y3V0cy9TaG9ydGN1dHNTZXJ2aWNlLnRzIiwic3JjL3Nob3J0Y3V0cy9pbmRleC50cyIsInNyYy91bnNhdmVkX2NoYW5nZXMvdW5zYXZlZENoYW5nZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxDQUFDO0lBQ0c7UUFDSSwwQkFDSSxRQUFnQjtZQUVoQixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFDTCx1QkFBQztJQUFELENBTkEsQUFNQyxJQUFBO0lBRUQsSUFBTSxVQUFVLEdBQUc7UUFDZixNQUFNLENBQUM7WUFDSCxRQUFRLEVBQUUsR0FBRztZQUNiLElBQUksRUFBRSxVQUNGLE1BQWlCLEVBQ2pCLFFBQWdCLEVBQ2hCLE1BQXNCO2dCQUV0QixJQUFJLGdCQUFjLENBQUMs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LE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzNELENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFO2dCQUNuQixPQUFPLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztnQkFDOUIsVUFBVSxFQUFFLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBQ0wsMkJBQUM7SUFBRCxDQXpCQSxBQXlCQyxJQUFBO0lBRUQsSUFBTSxjQUFjLEdBQUcsVUFBVSxPQUEwQjtRQUN2RCxNQUFNLENBQUM7WUFDSCxRQUFRLEVBQUUsSUFBSTtZQUNkLEtBQUssRUFBRTtnQkFDSCx1QkFBdUIsRUFBRSw2QkFBNkI7Z0JBQ3RELHFCQUFxQixFQUFFLDJCQUEyQjtnQkFDbEQsVUFBVSxFQUFFLDhCQUE4QjtnQkFDMUMsV0FBVyxFQUFFLCtCQUErQjthQUMvQztZQUNELElBQUksRUFBRSxVQUFVLE1BQTJCO2dCQUN2QyxJQUFJLG9CQUFrQixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUM1QyxDQUFDO1NBQ0osQ0FBQztJQUNOLENBQUMsQ0FBQTtJQUVELE9BQU87U0FDRixNQUFNLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO1NBQy9CLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxjQUFjLENBQUMsQ0FBQztBQUN4RCxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIntcclxuICAgIGNsYXNzIENhbmNlbERyYWdMaW5rIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICAkZWxlbWVudC5maW5kKCcqJykuYXR0cigncGlwLWNhbmNlbC1kcmFnJywgJ3BpcC1jYW5jZWwtZHJhZycpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBDYW5jZWxEcmFnID0gZnVuY3Rpb24gKCk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChcclxuICAgICAgICAgICAgICAgICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgICAgICRhdHRyczogbmcuSUF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgQ2FuY2VsRHJhZ0xpbmsoJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKFwicGlwRHJhZ2dhYmxlXCIpXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwQ2FuY2VsRHJhZycsIENhbmNlbERyYWcpO1xyXG59IiwiaW1wb3J0IHsgSURyYWdnYWJsZVNlcnZpY2UgfSBmcm9tICcuL0RyYWdnYWJsZVNlcnZpY2UnO1xyXG5cclxue1xyXG4gICAgaW50ZXJmYWNlIElEcmFnTGlua1Njb3BlIGV4dGVuZHMgbmcuSVNjb3BlIHtcclxuICAgICAgICB2YWx1ZTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGludGVyZmFjZSBJRHJhZ0xpbmtBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIG5nRHJhZzogYW55O1xyXG4gICAgICAgIHBpcERyYWdTdGFydDogYW55O1xyXG4gICAgICAgIHBpcERyYWdTdG9wOiBhbnk7XHJcbiAgICAgICAgcGlwRHJhZ1N1Y2Nlc3M6IGFueTtcclxuICAgICAgICBhbGxvd1RyYW5zZm9ybTogYW55O1xyXG4gICAgICAgIHBpcERyYWdEYXRhOiBhbnk7XHJcbiAgICAgICAgcGlwVmVydGljYWxTY3JvbGw6IGFueTtcclxuICAgICAgICBwaXBIb3Jpem9udGFsU2Nyb2xsOiBhbnk7XHJcbiAgICAgICAgcGlwQWN0aXZhdGlvbkRpc3RhbmNlOiBhbnk7XHJcbiAgICAgICAgcGlwU2Nyb2xsQ29udGFpbmVyOiBhbnk7XHJcbiAgICAgICAgcGlwRHJhZzogYW55O1xyXG4gICAgICAgIHBpcENlbnRlckFuY2hvcjogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIERyYWdMaW5rIHtcclxuICAgICAgICBwcml2YXRlIExPTkdfUFJFU1M6IG51bWJlciA9IDUwOyAvLyA1MG1zIGZvciBsb25ncHJlc3NcclxuICAgICAgICBwcml2YXRlIG9mZnNldDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgX2NlbnRlckFuY2hvcjogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIHByaXZhdGUgX214OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBfbXk6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIF90eDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX3R5OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBfbXJ4OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBfbXJ5OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBfaGFzVG91Y2g6IGJvb2xlYW4gPSAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KSB8fCAoIDwgYW55ID4gd2luZG93KS5Eb2N1bWVudFRvdWNoOyAvLyAmJiBkb2N1bWVudCBpbnN0YW5jZW9mIERvY3VtZW50VG91Y2g7IC8vIERvY3VtZW50VG91Y2ggaXMgbm90IGRlZmluZWQhXHJcbiAgICAgICAgcHJpdmF0ZSBfcHJlc3NFdmVudHM6IHN0cmluZyA9ICd0b3VjaHN0YXJ0IG1vdXNlZG93bic7XHJcbiAgICAgICAgcHJpdmF0ZSBfbW92ZUV2ZW50czogc3RyaW5nID0gJ3RvdWNobW92ZSBtb3VzZW1vdmUnO1xyXG4gICAgICAgIHByaXZhdGUgX3JlbGVhc2VFdmVudHM6IHN0cmluZyA9ICd0b3VjaGVuZCBtb3VzZXVwJztcclxuICAgICAgICBwcml2YXRlIF9kcmFnSGFuZGxlOiBhbnk7XHJcblxyXG4gICAgICAgIC8vIHRvIGlkZW50aWZ5IHRoZSBlbGVtZW50IGluIG9yZGVyIHRvIHByZXZlbnQgZ2V0dGluZyBzdXBlcmZsb3VzIGV2ZW50cyB3aGVuIGEgc2luZ2xlIGVsZW1lbnQgaGFzIGJvdGggZHJhZyBhbmQgZHJvcCBkaXJlY3RpdmVzIG9uIGl0LlxyXG4gICAgICAgIHByaXZhdGUgX215aWQ6IHN0cmluZyB8IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIF9kYXRhOiBhbnkgPSBudWxsO1xyXG5cclxuICAgICAgICBwcml2YXRlIF9kcmFnT2Zmc2V0OiBhbnkgPSBudWxsO1xyXG5cclxuICAgICAgICBwcml2YXRlIF9kcmFnRW5hYmxlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBwcml2YXRlIF9wcmVzc1RpbWVyOiBhbnkgPSBudWxsO1xyXG5cclxuICAgICAgICBwcml2YXRlIF9lbGVtZW50U3R5bGU6IGFueSA9IHt9O1xyXG5cclxuICAgICAgICBwcml2YXRlIG9uRHJhZ1N0YXJ0Q2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHByaXZhdGUgb25EcmFnU3RvcENhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgICAgICBwcml2YXRlIG9uRHJhZ1N1Y2Nlc3NDYWxsYmFjazogRnVuY3Rpb247XHJcbiAgICAgICAgcHJpdmF0ZSBhbGxvd1RyYW5zZm9ybTogYm9vbGVhbjtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBnZXREcmFnRGF0YTogYW55O1xyXG4gICAgICAgIHByaXZhdGUgdmVydGljYWxTY3JvbGw6IGJvb2xlYW47XHJcbiAgICAgICAgcHJpdmF0ZSBob3Jpem9udGFsU2Nyb2xsOiBib29sZWFuO1xyXG4gICAgICAgIHByaXZhdGUgYWN0aXZhdGlvbkRpc3RhbmNlOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxEaXN0YW5jZTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgc2Nyb2xsUGFyZW50OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHByaXZhdGUgc2Nyb2xsQ29udGFpbmVyOiBKUXVlcnkgPSBhbmd1bGFyLmVsZW1lbnQod2luZG93KTtcclxuICAgICAgICBwcml2YXRlIHNjcm9sbENvbnRhaW5lckdldHRlcjogYW55O1xyXG5cclxuICAgICAgICAvLyBkZXJlZ2lzdHJhdGlvbiBmdW5jdGlvbiBmb3IgbW91c2UgbW92ZSBldmVudHMgaW4gJHJvb3RTY29wZSB0cmlnZ2VyZWQgYnkganFMaXRlIHRyaWdnZXIgaGFuZGxlclxyXG4gICAgICAgIHByaXZhdGUgX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyOiBGdW5jdGlvbiA9IGFuZ3VsYXIubm9vcDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHBhcnNlOiBuZy5JUGFyc2VTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRkb2N1bWVudDogbmcuSURvY3VtZW50U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSBwaXBEcmFnZ2FibGU6IElEcmFnZ2FibGVTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRzY29wZTogSURyYWdMaW5rU2NvcGUsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkYXR0cnM6IElEcmFnTGlua0F0dHJpYnV0ZXNcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgJHNjb3BlLnZhbHVlID0gJGF0dHJzLm5nRHJhZztcclxuICAgICAgICAgICAgdGhpcy5fbXlpZCA9ICRzY29wZS4kaWQ7XHJcbiAgICAgICAgICAgIHRoaXMub25EcmFnU3RhcnRDYWxsYmFjayA9ICRwYXJzZSgkYXR0cnMucGlwRHJhZ1N0YXJ0KSB8fCBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLm9uRHJhZ1N0b3BDYWxsYmFjayA9ICRwYXJzZSgkYXR0cnMucGlwRHJhZ1N0b3ApIHx8IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMub25EcmFnU3VjY2Vzc0NhbGxiYWNrID0gJHBhcnNlKCRhdHRycy5waXBEcmFnU3VjY2VzcykgfHwgbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5hbGxvd1RyYW5zZm9ybSA9IGFuZ3VsYXIuaXNEZWZpbmVkKCRhdHRycy5hbGxvd1RyYW5zZm9ybSkgPyAkc2NvcGUuJGV2YWwoJGF0dHJzLmFsbG93VHJhbnNmb3JtKSA6IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5nZXREcmFnRGF0YSA9ICRwYXJzZSgkYXR0cnMucGlwRHJhZ0RhdGEpO1xyXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2FsU2Nyb2xsID0gJGF0dHJzLnBpcFZlcnRpY2FsU2Nyb2xsIHx8IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuaG9yaXpvbnRhbFNjcm9sbCA9ICRhdHRycy5waXBIb3Jpem9udGFsU2Nyb2xsIHx8IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGlvbkRpc3RhbmNlID0gcGFyc2VGbG9hdCgkYXR0cnMucGlwQWN0aXZhdGlvbkRpc3RhbmNlKSB8fCA3NTtcclxuICAgICAgICAgICAgdGhpcy5zY3JvbGxEaXN0YW5jZSA9IHBhcnNlRmxvYXQoJGF0dHJzLnBpcEFjdGl2YXRpb25EaXN0YW5jZSkgfHwgNTA7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyR2V0dGVyID0gJHBhcnNlKCRhdHRycy5waXBTY3JvbGxDb250YWluZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5jc3MoJ2N1cnNvcicsICdtb3ZlJyk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3BpcC1kcmFnZ2FibGUnLCAnZmFsc2UnKTsgLy8gcHJldmVudCBuYXRpdmUgZHJhZ1xyXG4gICAgICAgICAgICAvLyBjaGVjayB0byBzZWUgaWYgZHJhZyBoYW5kbGUocykgd2FzIHNwZWNpZmllZFxyXG4gICAgICAgICAgICAvLyBpZiBxdWVyeVNlbGVjdG9yQWxsIGlzIGF2YWlsYWJsZSwgd2UgdXNlIHRoaXMgaW5zdGVhZCBvZiBmaW5kXHJcbiAgICAgICAgICAgIC8vIGFzIEpRTGl0ZSBmaW5kIGlzIGxpbWl0ZWQgdG8gdGFnbmFtZXNcclxuICAgICAgICAgICAgbGV0IGRyYWdIYW5kbGVzOiBhbnk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiRlbGVtZW50WzBdLnF1ZXJ5U2VsZWN0b3JBbGwpIHtcclxuICAgICAgICAgICAgICAgIGRyYWdIYW5kbGVzID0gYW5ndWxhci5lbGVtZW50KHRoaXMuJGVsZW1lbnRbMF0ucXVlcnlTZWxlY3RvckFsbCgnW3BpcC1kcmFnLWhhbmRsZV0nKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBkcmFnSGFuZGxlcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW3BpcC1kcmFnLWhhbmRsZV0nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZHJhZ0hhbmRsZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9kcmFnSGFuZGxlID0gZHJhZ0hhbmRsZXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy50b2dnbGVMaXN0ZW5lcnModHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHNjcm9sbCBjb250YWluZXJcclxuICAgICAgICAgICAgaWYgKHRoaXMuc2Nyb2xsUGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudCh0aGlzLiRlbGVtZW50LnBhcmVudCgpKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLiRhdHRycy5waXBTY3JvbGxDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHRoaXMuc2Nyb2xsQ29udGFpbmVyR2V0dGVyKHRoaXMuJHNjb3BlKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgaWYgKCFlbmFibGUpIHJldHVybjtcclxuICAgICAgICAgICAgLy8gYWRkIGxpc3RlbmVycy5cclxuXHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRvbignJGRlc3Ryb3knLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRGVzdHJveShlbmFibGUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJHdhdGNoKHRoaXMuJGF0dHJzLnBpcERyYWcsIChuZXdWYWwsIG9sZFZhbCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkVuYWJsZUNoYW5nZShuZXdWYWwsIG9sZFZhbCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kd2F0Y2godGhpcy4kYXR0cnMucGlwQ2VudGVyQW5jaG9yLCAobmV3VmFsLCBvbGRWYWwpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25DZW50ZXJBbmNob3IobmV3VmFsLCBvbGRWYWwpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gd2lyZSB1cCB0b3VjaCBldmVudHNcclxuICAgICAgICAgICAgaWYgKHRoaXMuX2RyYWdIYW5kbGUpIHtcclxuICAgICAgICAgICAgICAgIC8vIGhhbmRsZShzKSBzcGVjaWZpZWQsIHVzZSB0aG9zZSB0byBpbml0aWF0ZSBkcmFnXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9kcmFnSGFuZGxlLm9uKHRoaXMuX3ByZXNzRXZlbnRzLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9ucHJlc3MoZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBubyBoYW5kbGUocykgc3BlY2lmaWVkLCB1c2UgdGhlIGVsZW1lbnQgYXMgdGhlIGhhbmRsZVxyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5vbih0aGlzLl9wcmVzc0V2ZW50cywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbnByZXNzKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5faGFzVG91Y2ggJiYgdGhpcy4kZWxlbWVudFswXS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09IFwiaW1nXCIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZG93bicsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9KTsgLy8gcHJldmVudCBuYXRpdmUgZHJhZyBmb3IgaW1hZ2VzXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25EZXN0cm95KGVuYWJsZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZUxpc3RlbmVycyhmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRW5hYmxlQ2hhbmdlKG5ld1ZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2RyYWdFbmFibGVkID0gKG5ld1ZhbCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uQ2VudGVyQW5jaG9yKG5ld1ZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChuZXdWYWwpKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fY2VudGVyQW5jaG9yID0gKG5ld1ZhbCB8fCAndHJ1ZScpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpc0NsaWNrYWJsZUVsZW1lbnQoZXZ0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmlzRGVmaW5lZChhbmd1bGFyLmVsZW1lbnQoZXZ0LnRhcmdldCkuYXR0cihcInBpcC1jYW5jZWwtZHJhZ1wiKSlcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgICogV2hlbiB0aGUgZWxlbWVudCBpcyBjbGlja2VkIHN0YXJ0IHRoZSBkcmFnIGJlaGF2aW91clxyXG4gICAgICAgICAqIE9uIHRvdWNoIGRldmljZXMgYXMgYSBzbWFsbCBkZWxheSBzbyBhcyBub3QgdG8gcHJldmVudCBuYXRpdmUgd2luZG93IHNjcm9sbGluZ1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgb25wcmVzcyhldnQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9kcmFnRW5hYmxlZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNDbGlja2FibGVFbGVtZW50KGV2dCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGV2dC50eXBlID09IFwibW91c2Vkb3duXCIgJiYgZXZ0LmJ1dHRvbiAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBEbyBub3Qgc3RhcnQgZHJhZ2dpbmcgb24gcmlnaHQtY2xpY2tcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zYXZlRWxlbWVudFN0eWxlcygpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuX2hhc1RvdWNoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmVzc1RpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxQcmVzcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25sb25ncHJlc3MoZXZ0KTtcclxuICAgICAgICAgICAgICAgIH0sIHRoaXMuTE9OR19QUkVTUyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRkb2N1bWVudC5vbih0aGlzLl9tb3ZlRXZlbnRzLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxQcmVzcygpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRkb2N1bWVudC5vbih0aGlzLl9yZWxlYXNlRXZlbnRzLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxQcmVzcygpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9ubG9uZ3ByZXNzKGV2dCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgc2F2ZUVsZW1lbnRTdHlsZXMoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnRTdHlsZS5sZWZ0ID0gdGhpcy4kZWxlbWVudC5jc3MoJ2NzcycpIHx8IDA7XHJcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnRTdHlsZS50b3AgPSB0aGlzLiRlbGVtZW50LmNzcygndG9wJykgfHwgMDtcclxuICAgICAgICAgICAgdGhpcy5fZWxlbWVudFN0eWxlLnBvc2l0aW9uID0gdGhpcy4kZWxlbWVudC5jc3MoJ3Bvc2l0aW9uJyk7XHJcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnRTdHlsZS53aWR0aCA9IHRoaXMuJGVsZW1lbnQuY3NzKCd3aWR0aCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjYW5jZWxQcmVzcygpIHtcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3ByZXNzVGltZXIpO1xyXG4gICAgICAgICAgICB0aGlzLiRkb2N1bWVudC5vZmYodGhpcy5fbW92ZUV2ZW50cywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxQcmVzcygpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub2ZmKHRoaXMuX3JlbGVhc2VFdmVudHMsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9ubG9uZ3ByZXNzKGV2dCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2RyYWdFbmFibGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5vZmZzZXQgPSB0aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5hbGxvd1RyYW5zZm9ybSlcclxuICAgICAgICAgICAgICAgIHRoaXMuX2RyYWdPZmZzZXQgPSB0aGlzLm9mZnNldDtcclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9kcmFnT2Zmc2V0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdCxcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgKCA8IGFueSA+IHRoaXMuJGVsZW1lbnQpLmNlbnRlclggPSB0aGlzLiRlbGVtZW50WzBdLm9mZnNldFdpZHRoIC8gMjtcclxuICAgICAgICAgICAgKCA8IGFueSA+IHRoaXMuJGVsZW1lbnQpLmNlbnRlclkgPSB0aGlzLiRlbGVtZW50WzBdLm9mZnNldEhlaWdodCAvIDI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9teCA9IHRoaXMucGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWDtcclxuICAgICAgICAgICAgdGhpcy5fbXkgPSB0aGlzLnBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVk7XHJcbiAgICAgICAgICAgIHRoaXMuX21yeCA9IHRoaXMuX214IC0gdGhpcy5vZmZzZXQubGVmdDtcclxuICAgICAgICAgICAgdGhpcy5fbXJ5ID0gdGhpcy5fbXkgLSB0aGlzLm9mZnNldC50b3A7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9jZW50ZXJBbmNob3IpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3R4ID0gdGhpcy5fbXggLSAoIDwgYW55ID4gdGhpcy4kZWxlbWVudCkuY2VudGVyWCAtIHRoaXMuJHdpbmRvdy5wYWdlWE9mZnNldDtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3R5ID0gdGhpcy5fbXkgLSAoIDwgYW55ID4gdGhpcy4kZWxlbWVudCkuY2VudGVyWSAtIHRoaXMuJHdpbmRvdy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3R4ID0gdGhpcy5fbXggLSB0aGlzLl9tcnggLSB0aGlzLiR3aW5kb3cucGFnZVhPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eSA9IHRoaXMuX215IC0gdGhpcy5fbXJ5IC0gdGhpcy4kd2luZG93LnBhZ2VZT2Zmc2V0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRkb2N1bWVudC5vbih0aGlzLl9tb3ZlRXZlbnRzLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25tb3ZlKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJGRvY3VtZW50Lm9uKHRoaXMuX3JlbGVhc2VFdmVudHMsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbnJlbGVhc2UoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gVGhpcyBldmVudCBpcyB1c2VkIHRvIHJlY2VpdmUgbWFudWFsbHkgdHJpZ2dlcmVkIG1vdXNlIG1vdmUgZXZlbnRzXHJcbiAgICAgICAgICAgIC8vIGpxTGl0ZSB1bmZvcnR1bmF0ZWx5IG9ubHkgc3VwcG9ydHMgdHJpZ2dlckhhbmRsZXIoLi4uKVxyXG4gICAgICAgICAgICAvLyBTZWUgaHR0cDovL2FwaS5qcXVlcnkuY29tL3RyaWdnZXJIYW5kbGVyL1xyXG4gICAgICAgICAgICAvLyBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbignZHJhZ2dhYmxlOl90cmlnZ2VySGFuZGxlck1vdmUnLCBvbm1vdmUpO1xyXG4gICAgICAgICAgICB0aGlzLl9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lciA9IHRoaXMuJHJvb3RTY29wZS4kb24oJ2RyYWdnYWJsZTpfdHJpZ2dlckhhbmRsZXJNb3ZlJywgKGV2ZW50LCBvcmlnRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25tb3ZlKG9yaWdFdmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbm1vdmUoZXZ0KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJhZ0VuYWJsZWQpIHJldHVybjtcclxuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy4kZWxlbWVudC5oYXNDbGFzcygncGlwLWRyYWdnaW5nJykpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2RhdGEgPSB0aGlzLmdldERyYWdEYXRhKHRoaXMuJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1kcmFnZ2luZycpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTpzdGFydCcsIHtcclxuICAgICAgICAgICAgICAgICAgICB4OiB0aGlzLl9teCxcclxuICAgICAgICAgICAgICAgICAgICB5OiB0aGlzLl9teSxcclxuICAgICAgICAgICAgICAgICAgICB0eDogdGhpcy5fdHgsXHJcbiAgICAgICAgICAgICAgICAgICAgdHk6IHRoaXMuX3R5LFxyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50OiBldnQsXHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogdGhpcy4kZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB0aGlzLl9kYXRhXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vbkRyYWdTdGFydENhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuJGFwcGx5KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdTdGFydENhbGxiYWNrKHRoaXMuJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZGF0YTogdGhpcy5fZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDogZXZ0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9teCA9IHRoaXMucGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWDtcclxuICAgICAgICAgICAgdGhpcy5fbXkgPSB0aGlzLnBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5ob3Jpem9udGFsU2Nyb2xsIHx8IHRoaXMudmVydGljYWxTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZHJhZ1RvU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9jZW50ZXJBbmNob3IpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3R4ID0gdGhpcy5fbXggLSAoIDwgYW55ID4gdGhpcy4kZWxlbWVudCkuY2VudGVyWCAtIHRoaXMuX2RyYWdPZmZzZXQubGVmdDtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3R5ID0gdGhpcy5fbXkgLSAoIDwgYW55ID4gdGhpcy4kZWxlbWVudCkuY2VudGVyWSAtIHRoaXMuX2RyYWdPZmZzZXQudG9wO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdHggPSB0aGlzLl9teCAtIHRoaXMuX21yeCAtIHRoaXMuX2RyYWdPZmZzZXQubGVmdDtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3R5ID0gdGhpcy5fbXkgLSB0aGlzLl9tcnkgLSB0aGlzLl9kcmFnT2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRWxlbWVudCh0aGlzLl90eCwgdGhpcy5fdHkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTptb3ZlJywge1xyXG4gICAgICAgICAgICAgICAgeDogdGhpcy5fbXgsXHJcbiAgICAgICAgICAgICAgICB5OiB0aGlzLl9teSxcclxuICAgICAgICAgICAgICAgIHR4OiB0aGlzLl90eCxcclxuICAgICAgICAgICAgICAgIHR5OiB0aGlzLl90eSxcclxuICAgICAgICAgICAgICAgIGV2ZW50OiBldnQsXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50OiB0aGlzLiRlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgZGF0YTogdGhpcy5fZGF0YSxcclxuICAgICAgICAgICAgICAgIHVpZDogdGhpcy5fbXlpZCxcclxuICAgICAgICAgICAgICAgIGRyYWdPZmZzZXQ6IHRoaXMuX2RyYWdPZmZzZXRcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9ucmVsZWFzZShldnQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9kcmFnRW5hYmxlZClcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdkcmFnZ2FibGU6ZW5kJywge1xyXG4gICAgICAgICAgICAgICAgeDogdGhpcy5fbXgsXHJcbiAgICAgICAgICAgICAgICB5OiB0aGlzLl9teSxcclxuICAgICAgICAgICAgICAgIHR4OiB0aGlzLl90eCxcclxuICAgICAgICAgICAgICAgIHR5OiB0aGlzLl90eSxcclxuICAgICAgICAgICAgICAgIGV2ZW50OiBldnQsXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50OiB0aGlzLiRlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgZGF0YTogdGhpcy5fZGF0YSxcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB0aGlzLm9uRHJhZ0NvbXBsZXRlLFxyXG4gICAgICAgICAgICAgICAgdWlkOiB0aGlzLl9teWlkXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5wYXJlbnQoKS5maW5kKCcucGlwLWRyYWctZW50ZXInKS5yZW1vdmVDbGFzcygncGlwLWRyYWctZW50ZXInKTtcclxuICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xyXG4gICAgICAgICAgICB0aGlzLiRkb2N1bWVudC5vZmYodGhpcy5fbW92ZUV2ZW50cyk7XHJcbiAgICAgICAgICAgIHRoaXMuJGRvY3VtZW50Lm9mZih0aGlzLl9yZWxlYXNlRXZlbnRzKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMub25EcmFnU3RvcENhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS4kYXBwbHkoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25EcmFnU3RvcENhbGxiYWNrKHRoaXMuJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkYXRhOiB0aGlzLl9kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IGV2dFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRHJhZ0NvbXBsZXRlKGV2dCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMub25EcmFnU3VjY2Vzc0NhbGxiYWNrKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kYXBwbHkoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdTdWNjZXNzQ2FsbGJhY2sodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAkZGF0YTogdGhpcy5fZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IGV2dFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSByZXNldCgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYWxsb3dUcmFuc2Zvcm0pXHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICctd2Via2l0LXRyYW5zZm9ybSc6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICctbXMtdHJhbnNmb3JtJzogJydcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5fZWxlbWVudFN0eWxlLnBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvcDogdGhpcy5fZWxlbWVudFN0eWxlLnRvcCxcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiB0aGlzLl9lbGVtZW50U3R5bGUubGVmdCxcclxuICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiB0aGlzLl9lbGVtZW50U3R5bGUud2lkdGhcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG1vdmVFbGVtZW50KHgsIHkpIHtcclxuICAgICAgICAgICAgY29uc3QgZVdpZHRoID0gdGhpcy4kZWxlbWVudC5jc3MoJ3dpZHRoJyk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmFsbG93VHJhbnNmb3JtKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiAnbWF0cml4M2QoMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgJyArIHggKyAnLCAnICsgeSArICcsIDAsIDEpJyxcclxuICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6IDk5OTk5LFxyXG4gICAgICAgICAgICAgICAgICAgICctd2Via2l0LXRyYW5zZm9ybSc6ICdtYXRyaXgzZCgxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAnICsgeCArICcsICcgKyB5ICsgJywgMCwgMSknLFxyXG4gICAgICAgICAgICAgICAgICAgICctbXMtdHJhbnNmb3JtJzogJ21hdHJpeCgxLCAwLCAwLCAxLCAnICsgeCArICcsICcgKyB5ICsgJyknXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICAnbGVmdCc6IHggKyAncHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICd0b3AnOiB5ICsgJ3B4JyxcclxuICAgICAgICAgICAgICAgICAgICAncG9zaXRpb24nOiAnZml4ZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICd6LWluZGV4JzogMTAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBlV2lkdGhcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGRyYWdUb1Njcm9sbCgpIHtcclxuICAgICAgICAgICAgbGV0IHNjcm9sbFggPSAwLFxyXG4gICAgICAgICAgICAgICAgc2Nyb2xsWSA9IDAsXHJcbiAgICAgICAgICAgICAgICBvZmZzZXQgPSAoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50Lm9mZnNldCgpIHx8IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiAwXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5ob3Jpem9udGFsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckxlZnQgPSBvZmZzZXQodGhpcy5zY3JvbGxDb250YWluZXIpLmxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyV2lkdGggPSB0aGlzLnNjcm9sbENvbnRhaW5lci5pbm5lcldpZHRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyUmlnaHQgPSBjb250YWluZXJMZWZ0ICsgY29udGFpbmVyV2lkdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCh0aGlzLl9teCAtIGNvbnRhaW5lckxlZnQpIDwgdGhpcy5hY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY3JvbGxYID0gLXRoaXMuc2Nyb2xsRGlzdGFuY2U7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKChjb250YWluZXJSaWdodCAtIHRoaXMuX214KSA8IHRoaXMuYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWCA9IHRoaXMuc2Nyb2xsRGlzdGFuY2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnZlcnRpY2FsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcCA9IG9mZnNldCh0aGlzLnNjcm9sbENvbnRhaW5lcikudG9wLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyLmlubmVySGVpZ2h0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gY29udGFpbmVyVG9wICsgY29udGFpbmVySGVpZ2h0O1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICgodGhpcy5fbXkgLSBjb250YWluZXJUb3ApIDwgdGhpcy5hY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY3JvbGxZID0gLXRoaXMuc2Nyb2xsRGlzdGFuY2UgKyAzMDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoKGNvbnRhaW5lckJvdHRvbSAtIHRoaXMuX215KSA8IHRoaXMuYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWSA9IHRoaXMuc2Nyb2xsRGlzdGFuY2UgLSAzMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc2Nyb2xsWCAhPT0gMCB8fCBzY3JvbGxZICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbExlZnQgPSB0aGlzLnNjcm9sbENvbnRhaW5lci5zY3JvbGxMZWZ0KCksXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsVG9wID0gdGhpcy5zY3JvbGxDb250YWluZXIuc2Nyb2xsVG9wKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIuc2Nyb2xsTGVmdChjb250YWluZXJTY3JvbGxMZWZ0ICsgc2Nyb2xsWCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AoY29udGFpbmVyU2Nyb2xsVG9wICsgc2Nyb2xsWSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBEcmFnID0gZnVuY3Rpb24gKFxyXG4gICAgICAgICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLFxyXG4gICAgICAgICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICAkZG9jdW1lbnQ6IG5nLklEb2N1bWVudFNlcnZpY2UsXHJcbiAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgcGlwRHJhZ2dhYmxlOiBJRHJhZ2dhYmxlU2VydmljZSxcclxuICAgICk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChcclxuICAgICAgICAgICAgICAgICRzY29wZTogSURyYWdMaW5rU2NvcGUsXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAgICAgJGF0dHJzOiBJRHJhZ0xpbmtBdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgbmV3IERyYWdMaW5rKCRyb290U2NvcGUsICRwYXJzZSwgJGRvY3VtZW50LCAkd2luZG93LCBwaXBEcmFnZ2FibGUsICRzY29wZSwgJGVsZW1lbnQsICRhdHRycyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIilcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBEcmFnJywgRHJhZyk7XHJcbn0iLCJleHBvcnQgaW50ZXJmYWNlIElEcmFnZ2FibGVTZXJ2aWNlIHtcclxuICAgIGlucHV0RXZlbnQoZXZlbnQ6IGFueSk7XHJcbn1cclxuXHJcbmNsYXNzIERyYWdnYWJsZVNlcnZpY2UgaW1wbGVtZW50cyBJRHJhZ2dhYmxlU2VydmljZSB7XHJcbiAgICBwdWJsaWMgaW5wdXRFdmVudChldmVudCkge1xyXG4gICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChldmVudC50b3VjaGVzKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXZlbnQudG91Y2hlc1swXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy9DaGVja2luZyBib3RoIGlzIG5vdCByZWR1bmRlbnQuIElmIG9ubHkgY2hlY2sgaWYgdG91Y2hlcyBpc0RlZmluZWQsIGFuZ3VsYXJqcyBpc0RlZm5pZWQgd2lsbCByZXR1cm4gZXJyb3IgYW5kIHN0b3AgdGhlIHJlbWFpbmluZyBzY3JpcHR5IGlmIGV2ZW50Lm9yaWdpbmFsRXZlbnQgaXMgbm90IGRlZmluZWQuXHJcbiAgICAgICAgZWxzZSBpZiAoYW5ndWxhci5pc0RlZmluZWQoZXZlbnQub3JpZ2luYWxFdmVudCkgJiYgYW5ndWxhci5pc0RlZmluZWQoZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZXZlbnQ7XHJcbiAgICB9O1xyXG59XHJcblxyXG5hbmd1bGFyXHJcbiAgICAubW9kdWxlKFwicGlwRHJhZ2dhYmxlXCIpXHJcbiAgICAuc2VydmljZSgncGlwRHJhZ2dhYmxlJywgRHJhZ2dhYmxlU2VydmljZSk7XHJcbiAgICAiLCJpbXBvcnQgeyBJRHJhZ2dhYmxlU2VydmljZSB9IGZyb20gJy4vRHJhZ2dhYmxlU2VydmljZSc7XHJcblxyXG57XHJcbiAgICBpbnRlcmZhY2UgSURyb3BMaW5rU2NvcGUgZXh0ZW5kcyBuZy5JU2NvcGUge1xyXG4gICAgICAgIHZhbHVlOiBhbnk7XHJcbiAgICAgICAgaXNUb3VjaGluZzogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGludGVyZmFjZSBJRHJvcExpbmtBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIHBpcERyb3A6IGFueTtcclxuICAgICAgICBwaXBEcm9wU3VjY2VzczogYW55O1xyXG4gICAgICAgIHBpcERyYWdTdGFydDogYW55O1xyXG4gICAgICAgIHBpcERyYWdTdG9wOiBhbnk7XHJcbiAgICAgICAgcGlwRHJhZ01vdmU6IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBEcm9wTGluayB7XHJcblxyXG4gICAgICAgIHByaXZhdGUgX2xhc3REcm9wVG91Y2g6IGFueTtcclxuICAgICAgICBwcml2YXRlIF9teWlkOiBudW1iZXIgfCBzdHJpbmc7XHJcbiAgICAgICAgcHJpdmF0ZSBfZHJvcEVuYWJsZWQ6IGJvb2xlYW47XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Ecm9wQ2FsbGJhY2s6IEZ1bmN0aW9uOyAvLyB8fCBmdW5jdGlvbigpe307XHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdTdGFydENhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgICAgICBwcml2YXRlIG9uRHJhZ1N0b3BDYWxsYmFjazogRnVuY3Rpb247XHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdNb3ZlQ2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcGFyc2U6IG5nLklQYXJzZVNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGRvY3VtZW50OiBuZy5JRG9jdW1lbnRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgcGlwRHJhZ2dhYmxlOiBJRHJhZ2dhYmxlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IElEcm9wTGlua1Njb3BlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGF0dHJzOiBJRHJvcExpbmtBdHRyaWJ1dGVzXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICRzY29wZS52YWx1ZSA9ICRhdHRycy5waXBEcm9wO1xyXG4gICAgICAgICAgICAkc2NvcGUuaXNUb3VjaGluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fbXlpZCA9ICRzY29wZS4kaWQ7XHJcbiAgICAgICAgICAgIHRoaXMub25Ecm9wQ2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyb3BTdWNjZXNzKTsgLy8gfHwgZnVuY3Rpb24oKXt9O1xyXG4gICAgICAgICAgICB0aGlzLm9uRHJhZ1N0YXJ0Q2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdTdGFydCk7XHJcbiAgICAgICAgICAgIHRoaXMub25EcmFnU3RvcENhbGxiYWNrID0gJHBhcnNlKCRhdHRycy5waXBEcmFnU3RvcCk7XHJcbiAgICAgICAgICAgIHRoaXMub25EcmFnTW92ZUNhbGxiYWNrID0gJHBhcnNlKCRhdHRycy5waXBEcmFnTW92ZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy50b2dnbGVMaXN0ZW5lcnModHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xyXG4gICAgICAgICAgICBpZiAoIWVuYWJsZSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kd2F0Y2godGhpcy4kYXR0cnMucGlwRHJvcCwgKG5ld1ZhbCwgb2xkVmFsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRW5hYmxlQ2hhbmdlKG5ld1ZhbCwgb2xkVmFsKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRvbignJGRlc3Ryb3knLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25EZXN0cm95KGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRvbignZHJhZ2dhYmxlOnN0YXJ0JywgKGV2dCwgb2JqKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ1N0YXJ0KGV2dCwgb2JqKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRvbignZHJhZ2dhYmxlOm1vdmUnLCAoZXZ0LCBvYmopID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25EcmFnTW92ZShldnQsIG9iaik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJ2RyYWdnYWJsZTplbmQnLCAoZXZ0LCBvYmopID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25EcmFnRW5kKGV2dCwgb2JqKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRGVzdHJveShlbmFibGUpIHtcclxuICAgICAgICAgICAgdGhpcy50b2dnbGVMaXN0ZW5lcnMoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkVuYWJsZUNoYW5nZShuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICB0aGlzLl9kcm9wRW5hYmxlZCA9IG5ld1ZhbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25EcmFnU3RhcnQoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9kcm9wRW5hYmxlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aGlzLmlzVG91Y2hpbmcob2JqLngsIG9iai55LCBvYmouZWxlbWVudCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy4kYXR0cnMucGlwRHJhZ1N0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ1N0YXJ0Q2FsbGJhY2sodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IG9iai5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IG9ialxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25EcmFnTW92ZShldnQsIG9iaikge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2Ryb3BFbmFibGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIHRoaXMuaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLiRhdHRycy5waXBEcmFnTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdNb3ZlQ2FsbGJhY2sodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IG9iai5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IG9ialxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25EcmFnRW5kKGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgIC8vIGRvbid0IGxpc3RlbiB0byBkcm9wIGV2ZW50cyBpZiB0aGlzIGlzIHRoZSBlbGVtZW50IGJlaW5nIGRyYWdnZWRcclxuICAgICAgICAgICAgLy8gb25seSB1cGRhdGUgdGhlIHN0eWxlcyBhbmQgcmV0dXJuXHJcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJvcEVuYWJsZWQgfHwgdGhpcy5fbXlpZCA9PT0gb2JqLnVpZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVEcmFnU3R5bGVzKGZhbHNlLCBvYmouZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzVG91Y2hpbmcob2JqLngsIG9iai55LCBvYmouZWxlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgIC8vIGNhbGwgdGhlIHBpcERyYWdnYWJsZSBwaXBEcmFnU3VjY2VzcyBlbGVtZW50IGNhbGxiYWNrXHJcbiAgICAgICAgICAgICAgICBpZiAob2JqLmNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb2JqLmNhbGxiYWNrKG9iaik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuJGF0dHJzLnBpcERyb3BTdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25Ecm9wQ2FsbGJhY2sodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRkYXRhOiBvYmouZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDogb2JqLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRhcmdldDogdGhpcy4kc2NvcGUuJGV2YWwodGhpcy4kc2NvcGUudmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy4kYXR0cnMucGlwRHJhZ1N0b3ApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25EcmFnU3RvcENhbGxiYWNrKHRoaXMuJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkYXRhOiBvYmouZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBvYmpcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZURyYWdTdHlsZXMoZmFsc2UsIG9iai5lbGVtZW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaXNUb3VjaGluZyhtb3VzZVgsIG1vdXNlWSwgZHJhZ0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgdG91Y2hpbmcgPSB0aGlzLmhpdFRlc3QobW91c2VYLCBtb3VzZVkpO1xyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS5pc1RvdWNoaW5nID0gdG91Y2hpbmc7XHJcbiAgICAgICAgICAgIGlmICh0b3VjaGluZykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbGFzdERyb3BUb3VjaCA9IHRoaXMuJGVsZW1lbnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVEcmFnU3R5bGVzKHRvdWNoaW5nLCBkcmFnRWxlbWVudCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0b3VjaGluZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgdXBkYXRlRHJhZ1N0eWxlcyh0b3VjaGluZywgZHJhZ0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgaWYgKHRvdWNoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0VsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1kcmFnLW92ZXInKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9sYXN0RHJvcFRvdWNoID09IHRoaXMuJGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2xhc3REcm9wVG91Y2ggPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWRyYWctZW50ZXInKTtcclxuICAgICAgICAgICAgICAgIGRyYWdFbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1vdmVyJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcml2YXRlIGhpdFRlc3QoeCwgeSkge1xyXG4gICAgICAgICAgICBjb25zdCBib3VuZHMgPSB0aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICB4IC09IHRoaXMuJGRvY3VtZW50WzBdLmJvZHkuc2Nyb2xsTGVmdCArIHRoaXMuJGRvY3VtZW50WzBdLmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xyXG4gICAgICAgICAgICB5IC09IHRoaXMuJGRvY3VtZW50WzBdLmJvZHkuc2Nyb2xsVG9wICsgdGhpcy4kZG9jdW1lbnRbMF0uZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgICAgICAgICAgcmV0dXJuIHggPj0gYm91bmRzLmxlZnQgJiZcclxuICAgICAgICAgICAgICAgIHggPD0gYm91bmRzLnJpZ2h0ICYmXHJcbiAgICAgICAgICAgICAgICB5IDw9IGJvdW5kcy5ib3R0b20gJiZcclxuICAgICAgICAgICAgICAgIHkgPj0gYm91bmRzLnRvcDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgRHJvcCA9IGZ1bmN0aW9uIChcclxuICAgICAgICAkcGFyc2U6IG5nLklQYXJzZVNlcnZpY2UsXHJcbiAgICAgICAgJGRvY3VtZW50OiBuZy5JRG9jdW1lbnRTZXJ2aWNlLFxyXG4gICAgICAgICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsXHJcbiAgICAgICAgcGlwRHJhZ2dhYmxlOiBJRHJhZ2dhYmxlU2VydmljZSxcclxuICAgICk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChcclxuICAgICAgICAgICAgICAgICRzY29wZTogSURyb3BMaW5rU2NvcGUsXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAgICAgJGF0dHJzOiBJRHJvcExpbmtBdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgbmV3IERyb3BMaW5rKCRwYXJzZSwgJGRvY3VtZW50LCAkdGltZW91dCwgcGlwRHJhZ2dhYmxlLCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKFwicGlwRHJhZ2dhYmxlXCIpXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwRHJvcCcsIERyb3ApO1xyXG59Iiwie1xyXG5cclxuICAgIGNsYXNzIFByZXZlbnREcmFnTGluayB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGVsZW1lbnQ6IEpRdWVyeVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7XHJcbiAgICAgICAgICAgIHRoaXMudG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lcnNcclxuICAgICAgICAgICAgaWYgKCFlbmFibGUpIHJldHVybjtcclxuICAgICAgICAgICAgLy8gYWRkIGxpc3RlbmVycy5cclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2Vkb3duIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJywgKGV2ZW50KSA9PiB7IHRoaXMuYWJzb3JiRXZlbnRfKGV2ZW50KTsgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGFic29yYkV2ZW50XyhldmVudCkge1xyXG4gICAgICAgICAgICBjb25zdCBlID0gZXZlbnQub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCAmJiBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uICYmIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBQcmV2ZW50RHJhZyA9IGZ1bmN0aW9uICgpOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoXHJcbiAgICAgICAgICAgICAgICAkc2NvcGU6IG5nLklTY29wZSxcclxuICAgICAgICAgICAgICAgICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgICAgICAkYXR0cnM6IG5nLklBdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgbmV3IFByZXZlbnREcmFnTGluaygkZWxlbWVudCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIilcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBQcmV2ZW50RHJhZycsIFByZXZlbnREcmFnKTtcclxufSIsImFuZ3VsYXIubW9kdWxlKFwicGlwRHJhZ2dhYmxlXCIsIFtdKTtcclxuXHJcbmltcG9ydCAnLi9EcmFnZ2FibGVTZXJ2aWNlJztcclxuaW1wb3J0ICcuL0RyYWcnO1xyXG5pbXBvcnQgJy4vRHJvcCc7XHJcbmltcG9ydCAnLi9QcmV2ZW50RHJhZyc7XHJcbmltcG9ydCAnLi9DYW5jZWxEcmFnJztcclxuIiwie1xyXG4gICAgaW50ZXJmYWNlIEZvY3VzZWRTY29wZSBleHRlbmRzIG5nLklTY29wZSB7XHJcbiAgICAgICAgcGlwRm9jdXNlZENvbG9yOiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBGb2N1c2VkQ2xhc3M6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcEZvY3VzZWRSZWJpbmQ6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcEZvY3VzZWRUYWJpbmRleDogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZE9wYWNpdHk6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcEZvY3VzZWREYXRhOiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBXaXRoSGlkZGVuOiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBSZWJpbmQ6IEZ1bmN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGludGVyZmFjZSBGb2N1c2VkQXR0cmlidXRlcyBleHRlbmRzIG5nLklBdHRyaWJ1dGVzIHtcclxuICAgICAgICBuZ01vZGVsOiBhbnk7XHJcbiAgICAgICAgcGlwRm9jdXNlZERhdGE6IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBGb2N1c2VkTGluayBpbXBsZW1lbnRzIG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHByaXZhdGUgY29udHJvbHM6IEpRdWVyeTtcclxuICAgICAgICBwcml2YXRlIGNvbnRyb2xzTGVuZ3RoOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBjb2xvcjogc3RyaW5nO1xyXG4gICAgICAgIHByaXZhdGUgb3BhY2l0eURlbHRhOiBudW1iZXIgPSAwLjQ7XHJcbiAgICAgICAgcHJpdmF0ZSBvcGFjaXR5TGltaXQ6IG51bWJlciA9IDAuNTtcclxuICAgICAgICBwcml2YXRlIG9sZEJhY2tncm91bmRDb2xvcjogc3RyaW5nO1xyXG4gICAgICAgIHByaXZhdGUgb25Gb2N1c0NsYXNzOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRzY29wZTogRm9jdXNlZFNjb3BlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgICRhdHRyczogRm9jdXNlZEF0dHJpYnV0ZXMsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbWRDb25zdGFudDogYW55LFxyXG4gICAgICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlXHJcbiAgICAgICAgKSB7XHJcblxyXG4gICAgICAgICAgICAkZWxlbWVudC5vbigna2V5ZG93bicsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmtleWRvd25MaXN0ZW5lcihlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoJGF0dHJzLm5nTW9kZWwpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ25nTW9kZWwnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQodGhpcy5pbml0KTtcclxuICAgICAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoJGF0dHJzLnBpcEZvY3VzZWREYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBGb2N1c2VkRGF0YScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dCh0aGlzLmluaXQpO1xyXG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdCgpIHtcclxuICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSB0aGlzLiRzY29wZS5waXBXaXRoSGlkZGVuICYmIHRoaXMuJHNjb3BlLnBpcFdpdGhIaWRkZW4oKSA/ICcucGlwLWZvY3VzYWJsZScgOiAnLnBpcC1mb2N1c2FibGU6dmlzaWJsZSc7XHJcbiAgICAgICAgICAgIHRoaXMub25Gb2N1c0NsYXNzID0gdGhpcy4kc2NvcGUucGlwRm9jdXNlZENsYXNzID8gdGhpcy4kc2NvcGUucGlwRm9jdXNlZENsYXNzKCkgOiAnJztcclxuICAgICAgICAgICAgdGhpcy5jb250cm9scyA9IHRoaXMuJGVsZW1lbnQuZmluZChzZWxlY3Rvcik7XHJcbiAgICAgICAgICAgIHRoaXMuY29udHJvbHNMZW5ndGggPSB0aGlzLmNvbnRyb2xzLmxlbmd0aDtcclxuICAgICAgICAgICAgdGhpcy5jaGVja1RhYmluZGV4KHRoaXMuY29udHJvbHMpO1xyXG4gICAgICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgIHRoaXMuY29udHJvbHMub24oJ2ZvY3VzJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBldmVudC5jdXJyZW50VGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgaWYgKCQodGFyZ2V0KS5oYXNDbGFzcygnbWQtZm9jdXNlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuJHNjb3BlLnBpcFJlYmluZCAmJiB0aGlzLiRzY29wZS5waXBSZWJpbmQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygncGlwLWZvY3VzZWQtY29udGFpbmVyJyk7XHJcbiAgICAgICAgICAgICAgICAkKHRhcmdldCkuYWRkQ2xhc3ModGhpcy5vbkZvY3VzQ2xhc3MpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLiRzY29wZS5waXBGb2N1c2VkT3BhY2l0eSB8fCAhdGhpcy4kc2NvcGUucGlwRm9jdXNlZE9wYWNpdHkoKSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbG9yID0gJCh0YXJnZXQpLmNzcygnYmFja2dyb3VuZENvbG9yJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbGRCYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLmNvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIHRoaXMucmdiYSh0aGlzLmNvbG9yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLmFkZENsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5hZGRDbGFzcygnbWQtZm9jdXNlZCBtZC1mb2N1c2VkLW9wYWNpdHknKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0pLm9uKCdmb2N1c291dCcsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXZlbnQuY3VycmVudFRhcmdldDtcclxuICAgICAgICAgICAgICAgIGlmICghJCh0YXJnZXQpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuICAgICAgICAgICAgICAgICQodGFyZ2V0KS5yZW1vdmVDbGFzcyh0aGlzLm9uRm9jdXNDbGFzcyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuJHNjb3BlLnBpcEZvY3VzZWRPcGFjaXR5IHx8ICF0aGlzLiRzY29wZS5waXBGb2N1c2VkT3BhY2l0eSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLmNzcygnYmFja2dyb3VuZENvbG9yJywgdGhpcy5vbGRCYWNrZ3JvdW5kQ29sb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5yZW1vdmVDbGFzcygnbWQtZm9jdXNlZCBtZC1mb2N1c2VkLW9wYWNpdHknKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSByZ2JhKGNvbG9yKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiRzY29wZS5waXBGb2N1c2VkQ29sb3IgJiYgdGhpcy4kc2NvcGUucGlwRm9jdXNlZENvbG9yKCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRzY29wZS5waXBGb2N1c2VkQ29sb3IoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgYXJyID0gY29sb3Iuc3BsaXQoXCIoXCIpWzFdLnNwbGl0KFwiKVwiKVswXS5zcGxpdChcIixcIik7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWFyciB8fCBhcnIubGVuZ3RoIDwgMykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICcnXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCByZWQsIGJsdWUsIGdyZWVuLCBvcGFjaXR5O1xyXG5cclxuICAgICAgICAgICAgb3BhY2l0eSA9IGFyci5sZW5ndGggPT0gMyA/IDEgOiBwYXJzZUZsb2F0KGFyclszXSk7XHJcbiAgICAgICAgICAgIHJlZCA9IGFyclswXTtcclxuICAgICAgICAgICAgYmx1ZSA9IGFyclsxXTtcclxuICAgICAgICAgICAgZ3JlZW4gPSBhcnJbMl07XHJcblxyXG4gICAgICAgICAgICBpZiAob3BhY2l0eSA8IHRoaXMub3BhY2l0eUxpbWl0KSB7XHJcbiAgICAgICAgICAgICAgICBvcGFjaXR5ICs9IHRoaXMub3BhY2l0eURlbHRhO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgb3BhY2l0eSAtPSB0aGlzLm9wYWNpdHlEZWx0YTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuICdyZ2JhKCcgKyByZWQgKyAnLCAnICsgYmx1ZSArICcsICcgKyBncmVlbiArICcsICcgKyBvcGFjaXR5ICsgJyknO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzZXRUYWJpbmRleChlbGVtZW50LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICBlbGVtZW50LmF0dHIoJ3RhYmluZGV4JywgdmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjaGVja1RhYmluZGV4KGNvbnRyb2xzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gXy5maW5kSW5kZXgoY29udHJvbHMsIChjKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY1sndGFiaW5kZXgnXSA+IC0xO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChpbmRleCA9PSAtMSAmJiBjb250cm9scy5sZW5ndGggPiAwICYmIHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRUYWJpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRUYWJpbmRleChhbmd1bGFyLmVsZW1lbnQoY29udHJvbHNbMF0pLCB0aGlzLiRzY29wZS5waXBGb2N1c2VkVGFiaW5kZXgoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUga2V5ZG93bkxpc3RlbmVyKGUpIHtcclxuICAgICAgICAgICAgY29uc3Qga2V5Q29kZSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xyXG4gICAgICAgICAgICAvLyBDaGVjayBjb250cm9sIGtleUNvZGVcclxuICAgICAgICAgICAgaWYgKGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5MRUZUX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuVVBfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1dcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3RcclxuICAgICAgICAgICAgICAgICAgICBpbmNyZW1lbnQgPSAoa2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8IGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XKSA/IDEgOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICBtb3ZlVG9Db250cm9sID0gdGhpcy5jb250cm9scy5pbmRleCh0aGlzLmNvbnRyb2xzLmZpbHRlcihcIi5tZC1mb2N1c2VkXCIpKSArIGluY3JlbWVudDtcclxuICAgICAgICAgICAgICAgIC8vIE1vdmUgZm9jdXMgdG8gbmV4dCBjb250cm9sXHJcbiAgICAgICAgICAgICAgICBpZiAobW92ZVRvQ29udHJvbCA+PSAwICYmIG1vdmVUb0NvbnRyb2wgPCB0aGlzLmNvbnRyb2xzTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb250cm9sc1ttb3ZlVG9Db250cm9sXS5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IEZvY3VzZWQgPSBmdW5jdGlvbiAoJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSwgXHJcbiAgICAgICAgJG1kQ29uc3RhbnQ6IGFueSwgXHJcbiAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2VcclxuICAgICk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICBwaXBGb2N1c2VkQ29sb3I6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBGb2N1c2VkQ2xhc3M6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBGb2N1c2VkUmViaW5kOiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwRm9jdXNlZFRhYmluZGV4OiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwRm9jdXNlZE9wYWNpdHk6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBGb2N1c2VkRGF0YTogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcFdpdGhIaWRkZW46ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBSZWJpbmQ6ICcmPydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlOiBGb2N1c2VkU2NvcGUsICRlbGVtZW50OiBKUXVlcnksICRhdHRyczogRm9jdXNlZEF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgICAgIG5ldyBGb2N1c2VkTGluaygkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsICR0aW1lb3V0LCAkbWRDb25zdGFudCwgJHdpbmRvdyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoXCJwaXBGb2N1c2VkXCIsIFtdKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcEZvY3VzZWQnLCBGb2N1c2VkKTtcclxufSIsIu+7v2ltcG9ydCAnLi91bnNhdmVkX2NoYW5nZXMvdW5zYXZlZENoYW5nZXMnO1xyXG5pbXBvcnQgJy4vc2hvcnRjdXRzL2luZGV4JztcclxuaW1wb3J0ICcuL2ZvY3VzZWQvZm9jdXNlZCc7XHJcbmltcG9ydCAnLi9kcmFnZ2FibGUvaW5kZXgnO1xyXG5pbXBvcnQgJy4vc2VsZWN0ZWQvc2VsZWN0ZWQnO1xyXG5pbXBvcnQgJy4vaW5maW5pdGVfc2Nyb2xsL2luZmluaXRlU2Nyb2xsJztcclxuXHJcbmFuZ3VsYXIubW9kdWxlKCdwaXBCZWhhdmlvcnMnLCBbXHJcbiAgICAncGlwRm9jdXNlZCcsXHJcbiAgICAncGlwU2VsZWN0ZWQnLFxyXG4gICAgJ3BpcEluZmluaXRlU2Nyb2xsJyxcclxuICAgICdwaXBVbnNhdmVkQ2hhbmdlcycsXHJcbiAgICAncGlwRHJhZ2dhYmxlJyxcclxuICAgICdwaXBTaG9ydGN1dHMnXHJcbl0pO1xyXG5cclxuZXhwb3J0ICogZnJvbSAnLi9zaG9ydGN1dHMvaW5kZXgnO1xyXG4iLCJ7XHJcbiAgICBpbnRlcmZhY2UgSW5maW5pdGVTY3JvbGxTY29wZSBleHRlbmRzIG5nLklTY29wZSB7XHJcbiAgICAgICAgcGlwSW5maW5pdGVTY3JvbGw6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcFNjcm9sbENvbnRhaW5lcjogSlF1ZXJ5O1xyXG4gICAgICAgIHBpcFNjcm9sbERpc3RhbmNlOiBudW1iZXIgfCBzdHJpbmc7XHJcbiAgICAgICAgcGlwU2Nyb2xsRGlzYWJsZWQ6IGJvb2xlYW47XHJcbiAgICAgICAgcGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b206IGJvb2xlYW47XHJcbiAgICAgICAgcGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQ6IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgSW5maW5pdGVTY3JvbGxBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIHBpcFNjcm9sbFBhcmVudDogYW55O1xyXG4gICAgICAgIHBpcFNjcm9sSW1tZWRpYXRlQ2hlY2s6IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBJbmZpbml0ZVNjcm9sbExpbmsge1xyXG4gICAgICAgIHByaXZhdGUgVEhST1RUTEVfTUlMTElTRUNPTkRTOiBudW1iZXIgPSA1MDA7XHJcbiAgICAgICAgcHJpdmF0ZSBjaGVja1doZW5FbmFibGVkID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIHNjcm9sbENvbnRhaW5lciA9IG51bGw7XHJcbiAgICAgICAgcHJpdmF0ZSBpbW1lZGlhdGVDaGVjayA9IHRydWU7XHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxEaXN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxFbmFibGVkID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIHVucmVnaXN0ZXJFdmVudExpc3RlbmVyID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIHVzZURvY3VtZW50Qm90dG9tID0gZmFsc2U7XHJcbiAgICAgICAgcHJpdmF0ZSB3aW5kb3dFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIG9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGU6IEZ1bmN0aW9uO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkaW50ZXJ2YWw6IG5nLklJbnRlcnZhbFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHNjb3BlOiBJbmZpbml0ZVNjcm9sbFNjb3BlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGF0dHJzOiBJbmZpbml0ZVNjcm9sbEF0dHJpYnV0ZXNcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgdGhpcy53aW5kb3dFbGVtZW50ID0gYW5ndWxhci5lbGVtZW50KCR3aW5kb3cpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlID0gXy50aHJvdHRsZSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgIH0sIHRoaXMuVEhST1RUTEVfTUlMTElTRUNPTkRTKTtcclxuXHJcbiAgICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIudW5iaW5kKCdzY3JvbGwnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVucmVnaXN0ZXJFdmVudExpc3RlbmVyICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnVucmVnaXN0ZXJFdmVudExpc3RlbmVyID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBTY3JvbGxEaXN0YW5jZScsICh2KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbERpc3RhbmNlKHYpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxEaXN0YW5jZSgkc2NvcGUucGlwU2Nyb2xsRGlzdGFuY2UpO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsRGlzYWJsZWQnLCAodikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxEaXNhYmxlZCh2KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsRGlzYWJsZWQoJHNjb3BlLnBpcFNjcm9sbERpc2FibGVkKTtcclxuXHJcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tJywgKHYpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20odik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKCRzY29wZS5waXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNoYW5nZUNvbnRhaW5lcih0aGlzLndpbmRvd0VsZW1lbnQpO1xyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLnBpcFNjcm9sbExpc3RlbkZvckV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVucmVnaXN0ZXJFdmVudExpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJHNjb3BlLnBpcFNjcm9sbExpc3RlbkZvckV2ZW50LCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsQ29udGFpbmVyJywgKG5ld0NvbnRhaW5lcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPSB0aGlzLnNjcm9sbENvbnRhaW5lcilcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbENvbnRhaW5lcihuZXdDb250YWluZXIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxDb250YWluZXIoJHNjb3BlLnBpcFNjcm9sbENvbnRhaW5lciB8fCBbXSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoJGF0dHJzLnBpcFNjcm9sbFBhcmVudCAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VDb250YWluZXIoYW5ndWxhci5lbGVtZW50KCRlbGVtZW50LnBhcmVudCgpKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCRhdHRycy5waXBTY3JvbEltbWVkaWF0ZUNoZWNrICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmltbWVkaWF0ZUNoZWNrID0gJHNjb3BlLiRldmFsKCRhdHRycy5waXBTY3JvbEltbWVkaWF0ZUNoZWNrKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgJGludGVydmFsKChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbW1lZGlhdGVDaGVjaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSksIDAsIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoZWlnaHQoZWxlbWVudCkge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXSB8fCBlbGVtZW50O1xyXG4gICAgICAgICAgICBpZiAoaXNOYU4oZWxlbWVudC5vZmZzZXRIZWlnaHQpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9mZnNldFRvcChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGlmICghZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QgfHwgZWxlbWVudC5jc3MoJ25vbmUnKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCArIHRoaXMucGFnZVlPZmZzZXQoZWxlbWVudCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHBhZ2VZT2Zmc2V0KGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnRbMF0gfHwgZWxlbWVudDtcclxuICAgICAgICAgICAgaWYgKGlzTmFOKHdpbmRvdy5wYWdlWU9mZnNldCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LnBhZ2VZT2Zmc2V0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uQ29udGFpbmVyU2Nyb2xsKCkge1xyXG4gICAgICAgICAgICBsZXQgY29udGFpbmVyQm90dG9tLFxyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyVG9wT2Zmc2V0LFxyXG4gICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSxcclxuICAgICAgICAgICAgICAgIHJlbWFpbmluZyxcclxuICAgICAgICAgICAgICAgIHNob3VsZFNjcm9sbDtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbENvbnRhaW5lciA9PT0gdGhpcy53aW5kb3dFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSB0aGlzLmhlaWdodCh0aGlzLnNjcm9sbENvbnRhaW5lcikgKyB0aGlzLnBhZ2VZT2Zmc2V0KHRoaXMuc2Nyb2xsQ29udGFpbmVyWzBdLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gdGhpcy5vZmZzZXRUb3AodGhpcy4kZWxlbWVudCkgKyB0aGlzLmhlaWdodCh0aGlzLiRlbGVtZW50KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IHRoaXMuaGVpZ2h0KHRoaXMuc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vZmZzZXRUb3AodGhpcy5zY3JvbGxDb250YWluZXIpICE9PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQgPSB0aGlzLm9mZnNldFRvcCh0aGlzLnNjcm9sbENvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gdGhpcy5vZmZzZXRUb3AodGhpcy4kZWxlbWVudCkgLSBjb250YWluZXJUb3BPZmZzZXQgKyB0aGlzLmhlaWdodCh0aGlzLiRlbGVtZW50KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMudXNlRG9jdW1lbnRCb3R0b20pIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSB0aGlzLmhlaWdodCgodGhpcy4kZWxlbWVudFswXS5vd25lckRvY3VtZW50IHx8ICggPCBhbnkgPiB0aGlzLiRlbGVtZW50WzBdKS5kb2N1bWVudCkuZG9jdW1lbnRFbGVtZW50KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVtYWluaW5nID0gZWxlbWVudEJvdHRvbSAtIGNvbnRhaW5lckJvdHRvbTtcclxuICAgICAgICAgICAgc2hvdWxkU2Nyb2xsID0gcmVtYWluaW5nIDw9IHRoaXMuaGVpZ2h0KHRoaXMuc2Nyb2xsQ29udGFpbmVyKSAqIHRoaXMuc2Nyb2xsRGlzdGFuY2UgKyAxO1xyXG5cclxuICAgICAgICAgICAgaWYgKHNob3VsZFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja1doZW5FbmFibGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbEVuYWJsZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy4kc2NvcGUuJCRwaGFzZSB8fCB0aGlzLiRyb290U2NvcGUuJCRwaGFzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kc2NvcGUucGlwSW5maW5pdGVTY3JvbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kc2NvcGUuJGFwcGx5KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLnBpcEluZmluaXRlU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNoZWNrV2hlbkVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTY3JvbGxEaXN0YW5jZSh2KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNjcm9sbERpc3RhbmNlID0gcGFyc2VGbG9hdCh2KSB8fCAwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTY3JvbGxEaXNhYmxlZCh2KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsRW5hYmxlZCA9ICF2O1xyXG4gICAgICAgICAgICBpZiAodGhpcy5zY3JvbGxFbmFibGVkICYmIHRoaXMuY2hlY2tXaGVuRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja1doZW5FbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSh2KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnVzZURvY3VtZW50Qm90dG9tID0gdjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY2hhbmdlQ29udGFpbmVyKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5zY3JvbGxDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyLnVuYmluZCgnc2Nyb2xsJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyID0gbmV3Q29udGFpbmVyO1xyXG4gICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxDb250YWluZXIuYmluZCgnc2Nyb2xsJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGFuZGxlU2Nyb2xsQ29udGFpbmVyKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICBpZiAoKG5ld0NvbnRhaW5lciA9PSBudWxsKSB8fCBuZXdDb250YWluZXIubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbmV3Q29udGFpbmVyLmFwcGVuZCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgbmV3Q29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KG5ld0NvbnRhaW5lcltuZXdDb250YWluZXIubGVuZ3RoIC0gMV0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBuZXdDb250YWluZXIgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb250YWluZXIgPSB0aGlzLiRlbGVtZW50LnBhcmVudHMoKS5maW5kKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIgIT0gbnVsbCAmJiAoIUFycmF5LmlzQXJyYXkobmV3Q29udGFpbmVyKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgIChBcnJheS5pc0FycmF5KG5ld0NvbnRhaW5lcikgJiYgbmV3Q29udGFpbmVyLmxlbmd0aCA+IDApKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2hhbmdlQ29udGFpbmVyKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHBpcC1zY3JvbGwtY29udGFpbmVyIGF0dHJpYnV0ZS5cIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IEluZmluaXRlU2Nyb2xsID0gZnVuY3Rpb24gKFxyXG4gICAgICAgICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLFxyXG4gICAgICAgICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgICRpbnRlcnZhbDogbmcuSUludGVydmFsU2VydmljZVxyXG4gICAgKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHBpcEluZmluaXRlU2Nyb2xsOiAnJicsXHJcbiAgICAgICAgICAgICAgICBwaXBTY3JvbGxDb250YWluZXI6ICc9JyxcclxuICAgICAgICAgICAgICAgIHBpcFNjcm9sbERpc3RhbmNlOiAnPScsXHJcbiAgICAgICAgICAgICAgICBwaXBTY3JvbGxEaXNhYmxlZDogJz0nLFxyXG4gICAgICAgICAgICAgICAgcGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b206ICc9JyxcclxuICAgICAgICAgICAgICAgIHBpcFNjcm9sbExpc3RlbkZvckV2ZW50OiAnQCdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiBJbmZpbml0ZVNjcm9sbFNjb3BlLFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgICAgICRhdHRyczogSW5maW5pdGVTY3JvbGxBdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgbmV3IEluZmluaXRlU2Nyb2xsTGluaygkcm9vdFNjb3BlLCAkd2luZG93LCAkaW50ZXJ2YWwsICRzY29wZSwgJGVsZW1lbnQsICRhdHRycyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoXCJwaXBJbmZpbml0ZVNjcm9sbFwiLCBbXSlcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBJbmZpbml0ZVNjcm9sbCcsIEluZmluaXRlU2Nyb2xsKTtcclxufSIsIntcclxuICAgIGludGVyZmFjZSBTZWxlY3RlZEF0dHJpYnV0ZXMgZXh0ZW5kcyBuZy5JQXR0cmlidXRlcyB7XHJcbiAgICAgICAgcGlwU2VsZWN0ZWQ6IGFueTtcclxuICAgICAgICBwaXBTZWxlY3RlZElkOiBhbnk7XHJcbiAgICAgICAgcGlwU2VsZWN0OiBhbnk7XHJcbiAgICAgICAgcGlwRW50ZXJTcGFjZVByZXNzOiBhbnk7XHJcbiAgICAgICAgcGlwTm9TY3JvbGw6IGFueTtcclxuICAgICAgICBwaXBTa2lwSGlkZGVuOiBhbnk7XHJcbiAgICAgICAgcGlwVHJlZUxpc3Q6IGFueTtcclxuICAgICAgICBwaXBTZWxlY3RlZFdhdGNoOiBhbnk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgU2VsZWN0ZWRMaW5rIHtcclxuICAgICAgICBwcml2YXRlIGluZGV4R2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBpbmRleFNldHRlcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgaWRTZXR0ZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIGlkR2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBjaGFuZ2VHZXR0ZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIGVudGVyU3BhY2VHZXR0ZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIG5vU2Nyb2xsOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBtb2RpZmllcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgY2xhc3NOYW1lOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBzZWxlY3RlZEluZGV4OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBjdXJyZW50RWxlbWVudFRhYmluZXg6IGFueTtcclxuICAgICAgICBwcml2YXRlIHBpcFNlbGVjdGVkV2F0Y2g6IGFueTtcclxuICAgICAgICBwcml2YXRlIGlzU2Nyb2xsZWQ6IGFueTtcclxuICAgICAgICAvLyBWYXJpYWJsZXMgZm9yIHRvdWNoIGZ1bmN0aW9uc1xyXG4gICAgICAgIHByaXZhdGUgdG91Y2hTdGFydFg6IGFueTtcclxuICAgICAgICBwcml2YXRlIHRvdWNoU3RhcnRZOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSB0cmFja2luZ0NsaWNrOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSB0cmFja2luZ0NsaWNrU3RhcnQ6IGFueTtcclxuICAgICAgICBwcml2YXRlIHRhcmdldEVsZW1lbnQ6IGFueTtcclxuICAgICAgICBwcml2YXRlIGxhc3RDbGlja1RpbWU6IGFueTtcclxuICAgICAgICBwcml2YXRlIGNhbmNlbE5leHRDbGljazogYW55O1xyXG4gICAgICAgIC8vIENvbnN0YW50cyBmb3IgdG91Y2ggZnVuY3Rpb25zXHJcbiAgICAgICAgcHJpdmF0ZSB0b3VjaEJvdW5kYXJ5OiBudW1iZXIgPSAxMDtcclxuICAgICAgICBwcml2YXRlIHRhcGRlbGF5OiBudW1iZXIgPSAyMDA7XHJcbiAgICAgICAgcHJpdmF0ZSB0YXBUaW1lb3V0OiBudW1iZXIgPSA3MDA7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICAkcGFyc2U6IG5nLklQYXJzZVNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJG1kQ29uc3RhbnQ6IGFueSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGF0dHJzOiBTZWxlY3RlZEF0dHJpYnV0ZXNcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgdGhpcy5pbmRleEdldHRlciA9ICRhdHRycy5waXBTZWxlY3RlZCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0ZWQpIDogbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5pbmRleFNldHRlciA9IHRoaXMuaW5kZXhHZXR0ZXIgPyB0aGlzLmluZGV4R2V0dGVyLmFzc2lnbiA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuaWRHZXR0ZXIgPSAkYXR0cnMucGlwU2VsZWN0ZWRJZCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0ZWRJZCkgOiBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmlkU2V0dGVyID0gdGhpcy5pZEdldHRlciA/IHRoaXMuaWRHZXR0ZXIuYXNzaWduIDogbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5jaGFuZ2VHZXR0ZXIgPSAkYXR0cnMucGlwU2VsZWN0ID8gJHBhcnNlKCRhdHRycy5waXBTZWxlY3QpIDogbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5lbnRlclNwYWNlR2V0dGVyID0gJGF0dHJzLnBpcEVudGVyU3BhY2VQcmVzcyA/ICRwYXJzZSgkYXR0cnMucGlwRW50ZXJTcGFjZVByZXNzKSA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMubm9TY3JvbGwgPSAkYXR0cnMucGlwTm9TY3JvbGw7XHJcbiAgICAgICAgICAgIHRoaXMubW9kaWZpZXIgPSAkYXR0cnMucGlwU2tpcEhpZGRlbiA/ICc6dmlzaWJsZScgOiAnJztcclxuICAgICAgICAgICAgdGhpcy5jbGFzc05hbWUgPSAkYXR0cnMucGlwVHJlZUxpc3QgPyAnLnBpcC1zZWxlY3RhYmxlLXRyZWUnIDogJy5waXAtc2VsZWN0YWJsZSc7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IHRoaXMuaW5kZXhHZXR0ZXIoJHNjb3BlKTtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50RWxlbWVudFRhYmluZXggPSAkZWxlbWVudC5hdHRyKCd0YWJpbmRleCcpO1xyXG4gICAgICAgICAgICB0aGlzLnBpcFNlbGVjdGVkV2F0Y2ggPSAkYXR0cnMucGlwU2VsZWN0ZWRXYXRjaDtcclxuICAgICAgICAgICAgdGhpcy5pc1Njcm9sbGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAkZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIHRoaXMuY3VycmVudEVsZW1lbnRUYWJpbmV4IHx8IDApO1xyXG5cclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2NsaWNrJywgdGhpcy5jbGFzc05hbWUsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkNsaWNrRXZlbnQoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNoc3RhcnQnLCB0aGlzLmNsYXNzTmFtZSwgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uVG91Y2hTdGFydChldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkZWxlbWVudC5vbigndG91Y2htb3ZlJywgdGhpcy5jbGFzc05hbWUsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vblRvdWNoTW92ZShldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkZWxlbWVudC5vbigndG91Y2hlbmQnLCB0aGlzLmNsYXNzTmFtZSwgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uVG91Y2hFbmQoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNoY2FuY2VsJywgdGhpcy5jbGFzc05hbWUsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vblRvdWNoQ2FuY2VsKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCdrZXlkb3duJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uS2V5RG93bihldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkZWxlbWVudC5vbignZm9jdXNpbicsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkZvY3VzSW4oZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2ZvY3Vzb3V0JywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRm9jdXNPdXQoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIFdhdGNoIHNlbGVjdGVkIGl0ZW0gaW5kZXhcclxuICAgICAgICAgICAgaWYgKCEkYXR0cnMucGlwVHJlZUxpc3QpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2godGhpcy5pbmRleEdldHRlciwgKG5ld1NlbGVjdGVkSW5kZXgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXg6IG5ld1NlbGVjdGVkSW5kZXhcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCh0aGlzLmlkR2V0dGVyLCAobmV3U2VsZWN0ZWRJZCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JZDogbmV3U2VsZWN0ZWRJZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gV2F0Y2ggcmVzeW5jIHNlbGVjdGlvblxyXG4gICAgICAgICAgICBpZiAodGhpcy5waXBTZWxlY3RlZFdhdGNoKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKHRoaXMucGlwU2VsZWN0ZWRXYXRjaCwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIERlbGF5IHVwZGF0ZSB0byBhbGxvdyBuZy1yZXBlYXQgdG8gdXBkYXRlIERPTVxyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gdGhpcy5pbmRleEdldHRlcigkc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTZWxlY3QgaXRlbSBkZWZpbmVkIGJ5IGluZGV4XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICBpdGVtSW5kZXg6IHRoaXMuc2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgIGl0ZW1zOiAkZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lKVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgc2VsZWN0SXRlbShpdGVtUGFyYW1zKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzU2Nyb2xsZWQpIHJldHVybjtcclxuICAgICAgICAgICAgbGV0IGl0ZW1JbmRleCA9IGl0ZW1QYXJhbXMuaXRlbUluZGV4LFxyXG4gICAgICAgICAgICAgICAgaXRlbUlkID0gaXRlbVBhcmFtcy5pdGVtSWQsXHJcbiAgICAgICAgICAgICAgICBpdGVtcyA9IGl0ZW1QYXJhbXMuaXRlbXMgfHwgdGhpcy4kZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lICsgdGhpcy5tb2RpZmllciksXHJcbiAgICAgICAgICAgICAgICBpdGVtc0xlbmd0aCA9IGl0ZW1zLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIGl0ZW0gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1QYXJhbXMuaXRlbSkgcmV0dXJuIGl0ZW1QYXJhbXMuaXRlbTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUluZGV4ID09PSB1bmRlZmluZWQgJiYgaXRlbUluZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXggPSBpdGVtcy5pbmRleChpdGVtcy5maWx0ZXIoJ1twaXAtaWQ9JyArIGl0ZW1JZCArICddJykpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbUluZGV4ID49IDAgJiYgaXRlbUluZGV4IDwgaXRlbXNMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW1zW2l0ZW1JbmRleF1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICByYWlzZUV2ZW50ID0gaXRlbVBhcmFtcy5yYWlzZUV2ZW50O1xyXG4gICAgICAgICAgICAgICAgaXRlbSA9IGl0ZW0oKTtcclxuICAgICAgICAgICAgaWYgKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSkucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkIG1kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgIGl0ZW0gPSA8YW55PmFuZ3VsYXIuZWxlbWVudChpdGVtKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2VsZWN0ZWQgbWQtZm9jdXNlZCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMubm9TY3JvbGwpIHRoaXMuc2Nyb2xsVG9JdGVtKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJhaXNlRXZlbnQpIHRoaXMuZGVmaW5lU2VsZWN0ZWRJbmRleChpdGVtcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcml2YXRlIGRlZmluZVNlbGVjdGVkSW5kZXgoaXRlbXMpIHtcclxuICAgICAgICAgICAgY29uc3Qgb2xkU2VsZWN0ZWRJbmRleCA9IHRoaXMuc2VsZWN0ZWRJbmRleDtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gLTE7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBpdGVtcy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgIGlmICgkKGl0ZW1zW2luZGV4XSkuaGFzQ2xhc3MoJ3NlbGVjdGVkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSBpbmRleDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZUluZGV4ID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW1zW3RoaXMuc2VsZWN0ZWRJbmRleF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBzZWxlY3RlZEl0ZW0uYXR0cigncGlwLWlkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5kZXhTZXR0ZXIpIHRoaXMuaW5kZXhTZXR0ZXIodGhpcy4kc2NvcGUsIHRoaXMuc2VsZWN0ZWRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZFNldHRlcikgdGhpcy5pZFNldHRlcih0aGlzLiRzY29wZSwgc2VsZWN0ZWRJZCk7XHJcbiAgICAgICAgICAgICAgICBvblNlbGVjdCgpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3Qgb25TZWxlY3QgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSBhbmd1bGFyLmVsZW1lbnQoaXRlbXNbdGhpcy5zZWxlY3RlZEluZGV4XSksXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJZCA9IHNlbGVjdGVkSXRlbS5hdHRyKCdwaXAtaWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jaGFuZ2VHZXR0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZUdldHRlcih0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGhpcy4kZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IHNlbGVjdGVkSXRlbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc2VsZWN0ZWRJZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0luZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJbmRleDogb2xkU2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEV4ZWN1dGUgY2FsbGJhY2sgdG8gbm90aWZ5IGFib3V0IGl0ZW0gc2VsZWN0XHJcbiAgICAgICAgICAgIGlmIChvbGRTZWxlY3RlZEluZGV4ICE9IHRoaXMuc2VsZWN0ZWRJbmRleCAmJiB0aGlzLnNlbGVjdGVkSW5kZXggIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS4kYXBwbHkoKCkgPT4geyB1cGRhdGVJbmRleCgpOyB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRhcHBseSgoKSA9PiB7IG9uU2VsZWN0KCk7IH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxUb0l0ZW0oJGl0ZW0pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubm9TY3JvbGwgfHwgISRpdGVtLm9mZnNldCgpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBjb25zdFxyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyVG9wID0gdGhpcy4kZWxlbWVudC5vZmZzZXQoKS50b3AsXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJIZWlnaHQgPSB0aGlzLiRlbGVtZW50LmhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gY29udGFpbmVyVG9wICsgY29udGFpbmVySGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgaXRlbVRvcCA9ICRpdGVtLm9mZnNldCgpLnRvcCxcclxuICAgICAgICAgICAgICAgIGl0ZW1IZWlnaHQgPSAkaXRlbS5vdXRlckhlaWdodCh0cnVlKSxcclxuICAgICAgICAgICAgICAgIGl0ZW1Cb3R0b20gPSBpdGVtVG9wICsgaXRlbUhlaWdodCxcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbFRvcCA9IHRoaXMuJGVsZW1lbnQuc2Nyb2xsVG9wKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmlzU2Nyb2xsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLiR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNTY3JvbGxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbnRhaW5lclRvcCA+IGl0ZW1Ub3ApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIGl0ZW1Ub3AgLSBjb250YWluZXJUb3ApO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnRhaW5lckJvdHRvbSA8IGl0ZW1Cb3R0b20pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIGl0ZW1Cb3R0b20gLSBjb250YWluZXJCb3R0b20pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRUYXJnZXRFbGVtZW50RnJvbUV2ZW50VGFyZ2V0KGV2ZW50VGFyZ2V0KSB7XHJcbiAgICAgICAgICAgIC8vIE9uIHNvbWUgb2xkZXIgYnJvd3NlcnMgdGhlIGV2ZW50IHRhcmdldCBtYXkgYmUgYSB0ZXh0IG5vZGUuXHJcbiAgICAgICAgICAgIGlmIChldmVudFRhcmdldC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudFRhcmdldC5wYXJlbnROb2RlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZXZlbnRUYXJnZXQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSB0b3VjaEhhc01vdmVkKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRvdWNoID0gZXZlbnQuY2hhbmdlZFRvdWNoZXNbMF0sXHJcbiAgICAgICAgICAgICAgICBib3VuZGFyeSA9IHRoaXMudG91Y2hCb3VuZGFyeTsgLy8gVG91Y2htb3ZlIGJvdW5kYXJ5LCBiZXlvbmQgd2hpY2ggYSBjbGljayB3aWxsIGJlIGNhbmNlbGxlZC5cclxuXHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyh0b3VjaC5wYWdlWCAtIHRoaXMudG91Y2hTdGFydFgpID4gYm91bmRhcnkgfHwgTWF0aC5hYnModG91Y2gucGFnZVkgLSB0aGlzLnRvdWNoU3RhcnRZKSA+IGJvdW5kYXJ5KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25DbGlja0V2ZW50KGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICBpdGVtOiBldmVudC5jdXJyZW50VGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgcmFpc2VFdmVudDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Ub3VjaFN0YXJ0KGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGV2ID0gZXZlbnQub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgaWYgKGV2Wyd0YXJnZXRUb3VjaGVzJ10ubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RWxlbWVudCA9IHRoaXMuZ2V0VGFyZ2V0RWxlbWVudEZyb21FdmVudFRhcmdldChldi50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgdG91Y2ggPSBldlsndGFyZ2V0VG91Y2hlcyddWzBdO1xyXG5cclxuICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrU3RhcnQgPSBldi50aW1lU3RhbXA7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQ7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRvdWNoU3RhcnRYID0gdG91Y2gucGFnZVg7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2hTdGFydFkgPSB0b3VjaC5wYWdlWTtcclxuXHJcbiAgICAgICAgICAgIC8qaWYgKChldi50aW1lU3RhbXAgLSB0aGlzLmxhc3RDbGlja1RpbWUpIDwgdGhpcy50YXBkZWxheSkge1xyXG4gICAgICAgICAgICAgICAgLy8gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIH0qL1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uVG91Y2hNb3ZlKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy50cmFja2luZ0NsaWNrKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBldiA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAgICAgICAgIC8vIElmIHRoZSB0b3VjaCBoYXMgbW92ZWQsIGNhbmNlbCB0aGUgY2xpY2sgdHJhY2tpbmdcclxuICAgICAgICAgICAgaWYgKHRoaXMudGFyZ2V0RWxlbWVudCAhPT0gdGhpcy5nZXRUYXJnZXRFbGVtZW50RnJvbUV2ZW50VGFyZ2V0KGV2LnRhcmdldCkgfHwgdGhpcy50b3VjaEhhc01vdmVkKGV2KSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRhcmdldEVsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Ub3VjaEVuZChldmVudCkge1xyXG4gICAgICAgICAgICBsZXQgZm9yRWxlbWVudCwgbmV3VHJhY2tpbmdDbGlja1N0YXJ0LCB0YXJnZXRUYWdOYW1lLCBzY3JvbGxQYXJlbnQsIHRvdWNoLCBuZXd0YXJnZXRFbGVtZW50ID0gdGhpcy50YXJnZXRFbGVtZW50O1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLnRyYWNraW5nQ2xpY2spIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGV2ID0gZXZlbnQub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgLy8gUHJldmVudCBwaGFudG9tIGNsaWNrcyBvbiBmYXN0IGRvdWJsZS10YXAgXHJcbiAgICAgICAgICAgIGlmICgoZXYudGltZVN0YW1wIC0gdGhpcy5sYXN0Q2xpY2tUaW1lKSA8IHRoaXMudGFwZGVsYXkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsTmV4dENsaWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoKGV2LnRpbWVTdGFtcCAtIHRoaXMudHJhY2tpbmdDbGlja1N0YXJ0KSA+IHRoaXMudGFwVGltZW91dCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFJlc2V0IHRvIHByZXZlbnQgd3JvbmcgY2xpY2sgY2FuY2VsIG9uIGlucHV0IFxyXG4gICAgICAgICAgICB0aGlzLmNhbmNlbE5leHRDbGljayA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5sYXN0Q2xpY2tUaW1lID0gZXZlbnQudGltZVN0YW1wO1xyXG5cclxuICAgICAgICAgICAgbmV3VHJhY2tpbmdDbGlja1N0YXJ0ID0gdGhpcy50cmFja2luZ0NsaWNrU3RhcnQ7XHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tpbmdDbGljayA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2tTdGFydCA9IDA7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgaXRlbTogZXZlbnQuY3VycmVudFRhcmdldCxcclxuICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uVG91Y2hDYW5jZWwoZXZlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0RWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uS2V5RG93bihldmVudCkge1xyXG4gICAgICAgICAgICB2YXIga2V5Q29kZSA9IGV2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGU7XHJcblxyXG4gICAgICAgICAgICAvLyBDaGVjayBjb250cm9sIGtleUNvZGVcclxuICAgICAgICAgICAgaWYgKGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5FTlRFUiB8fCBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuU1BBQ0UpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5lbnRlclNwYWNlR2V0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbnRlclNwYWNlR2V0dGVyKHRoaXMuJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB0aGlzLiRlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6IHRoaXMuc2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IHRoaXMuJGVsZW1lbnQuZmluZCgnLnNlbGVjdGVkJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgIGlmIChrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuTEVGVF9BUlJPVyB8fCBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5VUF9BUlJPVyB8fCBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPV1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBHZXQgbmV4dCBzZWxlY3RhYmxlIGNvbnRyb2wgaW5kZXhcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy4kZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lICsgdGhpcy5tb2RpZmllciksXHJcbiAgICAgICAgICAgICAgICAgICAgaW5jID0gKGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fCBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykgPyAxIDogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0ZWRJbmRleCA9IHRoaXMuc2VsZWN0ZWRJbmRleCArIGluYztcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBTZXQgbmV4dCBjb250cm9sIGFzIHNlbGVjdGVkXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogbmV3U2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICBpdGVtczogaXRlbXMsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFpc2VFdmVudDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Gb2N1c0luKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIC8vIENob29zZSBzZWxlY3RlZCBlbGVtZW50XHJcbiAgICAgICAgICAgIGxldCBpdGVtcyxcclxuICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbSA9IHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSArICcuc2VsZWN0ZWQnKTtcclxuXHJcbiAgICAgICAgICAgIHNlbGVjdGVkSXRlbS5hZGRDbGFzcygnbWQtZm9jdXNlZCcpO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vdCBzZWxlY3RlZCBlbGVtZW50cyB0aGVuIHBpY2sgdGhlIGZpcnN0IG9uZVxyXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gdGhpcy5pbmRleEdldHRlcih0aGlzLiRzY29wZSk7XHJcbiAgICAgICAgICAgICAgICBpdGVtcyA9IHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSArIHRoaXMubW9kaWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXg6IHRoaXMuc2VsZWN0ZWRJbmRleCB8fCAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiBpdGVtcyxcclxuICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkZvY3VzT3V0KGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSArICcubWQtZm9jdXNlZCcgKyB0aGlzLm1vZGlmaWVyKS5yZW1vdmVDbGFzcygnbWQtZm9jdXNlZCcpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBTZWxlY3RlZCA9IGZ1bmN0aW9uIChcclxuICAgICAgICAkcGFyc2U6IG5nLklQYXJzZVNlcnZpY2UsXHJcbiAgICAgICAgJG1kQ29uc3RhbnQ6IGFueSxcclxuICAgICAgICAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlXHJcbiAgICApOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChcclxuICAgICAgICAgICAgICAgICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgICAgICRhdHRyczogU2VsZWN0ZWRBdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgbmV3IFNlbGVjdGVkTGluaygkcGFyc2UsICRtZENvbnN0YW50LCAkdGltZW91dCwgJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcInBpcFNlbGVjdGVkXCIsIFtdKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcFNlbGVjdGVkJywgU2VsZWN0ZWQpO1xyXG59IiwiaW1wb3J0IHsgU2hvcnRjdXRPcHRpb25zIH0gZnJvbSBcIi4vU2hvcnRjdXRcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dEl0ZW0ge1xyXG4gICAgLy8gU2hvcnRjdXQgY29tYmluYXRpb25cclxuICAgIHB1YmxpYyBzaG9ydGN1dDogc3RyaW5nO1xyXG4gICAgLy8gVGFyZ2V0IG9iamVjdCBcclxuICAgIHB1YmxpYyB0YXJnZXQ/OiBhbnk7XHJcbiAgICAvLyBUYXJnZXQgZWxlbWVudCBieSBJZFxyXG4gICAgcHVibGljIHRhcmdldElkPzogc3RyaW5nO1xyXG4gICAgLy8gVGFyZ2V0IGVsZW1lbnQgYnkgY2xhc3MgKGZpcnN0ZWxlbWVudD8/KVxyXG4gICAgLy8gUHVibGljIHRhcmdldENsYXNzPzogc3RyaW5nO1xyXG4gICAgLy8gQWNjZXNzIGZ1bmN0aW9uXHJcbiAgICBwdWJsaWMgYWNjZXNzPzogKGV2ZW50OiBKUXVlcnlFdmVudE9iamVjdCkgPT4gYm9vbGVhbjtcclxuICAgIC8vIFdpbmRvdy5sb2NhdGlvbi5ocmVmXHJcbiAgICBwdWJsaWMgaHJlZj86IHN0cmluZztcclxuICAgIC8vICRsb2NhdGlvbi51cmxcclxuICAgIHB1YmxpYyB1cmw/OiBzdHJpbmc7XHJcbiAgICAvLyAkc3RhdGUuZ28oc3RhdGUsIHN0YXRlUGFyYW1zKVxyXG4gICAgcHVibGljIHN0YXRlPzogc3RyaW5nO1xyXG4gICAgLy8gUGFyYW1ldGVycyBmb3IgJHN0YXRlLmdvKHN0YXRlLCBzdGF0ZVBhcmFtcylcclxuICAgIHB1YmxpYyBzdGF0ZVBhcmFtcz86IGFueTtcclxuICAgIC8vICRyb290U2NvcGUuYnJvYWRjYXN0KGV2ZW50KVxyXG4gICAgcHVibGljIGV2ZW50Pzogc3RyaW5nO1xyXG4gICAgLy8gQ2xpY2sgY2FsbGJhY2tcclxuICAgIHB1YmxpYyBrZXlwcmVzcz86IChldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWQ7XHJcbiAgICAvLyBEZWZhdWx0IG9wdGlvbnNcclxuICAgIHB1YmxpYyBvcHRpb25zPzogU2hvcnRjdXRPcHRpb25zOyAgICBcclxufVxyXG5cclxuLy8gZXhwb3J0IGNsYXNzIFNob3J0Y3V0SXRlbSBleHRlbmRzIFNpbXBsZVNob3J0Y3V0SXRlbSB7XHJcbi8vICAgICBwdWJsaWMgc2hvcnRjdXRzOiBTaW1wbGVTaG9ydGN1dEl0ZW1bXTtcclxuLy8gfVxyXG5cclxuZXhwb3J0IGNsYXNzIFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAvLyBHbG9iYWwgc2hvcnRjdXQgXHJcbiAgICBwdWJsaWMgZ2xvYmFsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXSA9IFtdO1xyXG4gICAgLy8gTG9jYWwgc2hvcnRjdXQgXHJcbiAgICBwdWJsaWMgbG9jYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdID0gW107XHJcbiAgICAvLyBEZWZhdWx0IG9wdGlvbnNcclxuICAgIHB1YmxpYyBkZWZhdWx0T3B0aW9uczogU2hvcnRjdXRPcHRpb25zID0gbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzU2VydmljZSB7XHJcbiAgICByZWFkb25seSBjb25maWc6IFNob3J0Y3V0c0NvbmZpZztcclxuXHJcbiAgICBnbG9iYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG4gICAgbG9jYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElTaG9ydGN1dHNQcm92aWRlciBleHRlbmRzIG5nLklTZXJ2aWNlUHJvdmlkZXIge1xyXG4gICAgY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcbiAgICBcclxuICAgIGdsb2JhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW107XHJcbiAgICBkZWZhdWx0T3B0aW9uczogU2hvcnRjdXRPcHRpb25zO1xyXG59XHJcbiIsImV4cG9ydCBjbGFzcyBLZXlib2FyZEV2ZW50IHtcclxuICAgIHN0YXRpYyBLZXlkb3duOiBzdHJpbmcgPSAna2V5ZG93bic7XHJcbiAgICBzdGF0aWMgS2V5dXA6IHN0cmluZyA9ICdrZXl1cCc7XHJcbiAgICBzdGF0aWMgS2V5cHJlc3M6IHN0cmluZyA9ICdrZXlwcmVzcyc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dE9wdGlvbnMge1xyXG4gICAgVHlwZTogS2V5Ym9hcmRFdmVudDtcclxuICAgIFByb3BhZ2F0ZTogYm9vbGVhbjtcclxuICAgIERpc2FibGVJbklucHV0OiBib29sZWFuO1xyXG4gICAgVGFyZ2V0OiBhbnk7IC8vIEV2ZW50IHRhcmdldCBvYmplY3RcclxuICAgIEtleWNvZGU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNob3J0Y3V0IHtcclxuICAgIHByaXZhdGUgc2hpZnRfbnVtcyA9IHtcclxuICAgICAgICBcImBcIjogXCJ+XCIsXHJcbiAgICAgICAgXCIxXCI6IFwiIVwiLFxyXG4gICAgICAgIFwiMlwiOiBcIkBcIixcclxuICAgICAgICBcIjNcIjogXCIjXCIsXHJcbiAgICAgICAgXCI0XCI6IFwiJFwiLFxyXG4gICAgICAgIFwiNVwiOiBcIiVcIixcclxuICAgICAgICBcIjZcIjogXCJeXCIsXHJcbiAgICAgICAgXCI3XCI6IFwiJlwiLFxyXG4gICAgICAgIFwiOFwiOiBcIipcIixcclxuICAgICAgICBcIjlcIjogXCIoXCIsXHJcbiAgICAgICAgXCIwXCI6IFwiKVwiLFxyXG4gICAgICAgIFwiLVwiOiBcIl9cIixcclxuICAgICAgICBcIj1cIjogXCIrXCIsXHJcbiAgICAgICAgXCI7XCI6IFwiOlwiLFxyXG4gICAgICAgIFwiJ1wiOiBcIlxcXCJcIixcclxuICAgICAgICBcIixcIjogXCI8XCIsXHJcbiAgICAgICAgXCIuXCI6IFwiPlwiLFxyXG4gICAgICAgIFwiL1wiOiBcIj9cIixcclxuICAgICAgICBcIlxcXFxcIjogXCJ8XCJcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBzcGVjaWFsX2tleXMgPSB7XHJcbiAgICAgICAgJ2VzYyc6IDI3LFxyXG4gICAgICAgICdlc2NhcGUnOiAyNyxcclxuICAgICAgICAndGFiJzogOSxcclxuICAgICAgICAnc3BhY2UnOiAzMixcclxuICAgICAgICAncmV0dXJuJzogMTMsXHJcbiAgICAgICAgJ2VudGVyJzogMTMsXHJcbiAgICAgICAgJ2JhY2tzcGFjZSc6IDgsXHJcblxyXG4gICAgICAgICdzY3JvbGxsb2NrJzogMTQ1LFxyXG4gICAgICAgICdzY3JvbGxfbG9jayc6IDE0NSxcclxuICAgICAgICAnc2Nyb2xsJzogMTQ1LFxyXG4gICAgICAgICdjYXBzbG9jayc6IDIwLFxyXG4gICAgICAgICdjYXBzX2xvY2snOiAyMCxcclxuICAgICAgICAnY2Fwcyc6IDIwLFxyXG4gICAgICAgICdudW1sb2NrJzogMTQ0LFxyXG4gICAgICAgICdudW1fbG9jayc6IDE0NCxcclxuICAgICAgICAnbnVtJzogMTQ0LFxyXG5cclxuICAgICAgICAncGF1c2UnOiAxOSxcclxuICAgICAgICAnYnJlYWsnOiAxOSxcclxuXHJcbiAgICAgICAgJ2luc2VydCc6IDQ1LFxyXG4gICAgICAgICdob21lJzogMzYsXHJcbiAgICAgICAgJ2RlbGV0ZSc6IDQ2LFxyXG4gICAgICAgICdlbmQnOiAzNSxcclxuXHJcbiAgICAgICAgJ3BhZ2V1cCc6IDMzLFxyXG4gICAgICAgICdwYWdlX3VwJzogMzMsXHJcbiAgICAgICAgJ3B1JzogMzMsXHJcblxyXG4gICAgICAgICdwYWdlZG93bic6IDM0LFxyXG4gICAgICAgICdwYWdlX2Rvd24nOiAzNCxcclxuICAgICAgICAncGQnOiAzNCxcclxuXHJcbiAgICAgICAgJ2xlZnQnOiAzNyxcclxuICAgICAgICAndXAnOiAzOCxcclxuICAgICAgICAncmlnaHQnOiAzOSxcclxuICAgICAgICAnZG93bic6IDQwLFxyXG5cclxuICAgICAgICAnZjEnOiAxMTIsXHJcbiAgICAgICAgJ2YyJzogMTEzLFxyXG4gICAgICAgICdmMyc6IDExNCxcclxuICAgICAgICAnZjQnOiAxMTUsXHJcbiAgICAgICAgJ2Y1JzogMTE2LFxyXG4gICAgICAgICdmNic6IDExNyxcclxuICAgICAgICAnZjcnOiAxMTgsXHJcbiAgICAgICAgJ2Y4JzogMTE5LFxyXG4gICAgICAgICdmOSc6IDEyMCxcclxuICAgICAgICAnZjEwJzogMTIxLFxyXG4gICAgICAgICdmMTEnOiAxMjIsXHJcbiAgICAgICAgJ2YxMic6IDEyM1xyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIG1vZGlmaWVycyA9IHtcclxuICAgICAgICBzaGlmdDogeyB3YW50ZWQ6IGZhbHNlLCBwcmVzc2VkOiBmYWxzZSB9LFxyXG4gICAgICAgIGN0cmw6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfSxcclxuICAgICAgICBhbHQ6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfSxcclxuICAgICAgICBtZXRhOiB7IHdhbnRlZDogZmFsc2UsIHByZXNzZWQ6IGZhbHNlIH1cdC8vIE1ldGEgaXMgTWFjIHNwZWNpZmljXHJcbiAgICB9O1xyXG5cclxuICAgIHB1YmxpYyBldmVudENhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgIHB1YmxpYyB0YXJnZXQ6IGFueTtcclxuICAgIHB1YmxpYyBldmVudDogS2V5Ym9hcmRFdmVudDtcclxuICAgIHB1YmxpYyBvcHRpb246IFNob3J0Y3V0T3B0aW9ucztcclxuICAgIHB1YmxpYyBzaG9yY3V0OiBzdHJpbmc7XHJcbiAgICBwdWJsaWMgY2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICBlbGVtZW50OiBhbnksXHJcbiAgICAgICAgc2hvcmN1dENvbWJpbmF0aW9uOiBzdHJpbmcsXHJcbiAgICAgICAgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMsXHJcbiAgICAgICAgY2FsbGJhY2s6IChlPzogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWRcclxuICAgICkge1xyXG4gICAgICAgIFwibmdJbmplY3RcIjtcclxuXHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBlbGVtZW50O1xyXG4gICAgICAgIHRoaXMuc2hvcmN1dCA9IHNob3JjdXRDb21iaW5hdGlvbjtcclxuICAgICAgICB0aGlzLmV2ZW50ID0gb3B0aW9uLlR5cGU7XHJcbiAgICAgICAgdGhpcy5vcHRpb24gPSBvcHRpb247XHJcbiAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cclxuICAgICAgICB0aGlzLmV2ZW50Q2FsbGJhY2sgPSAoZXZlbnQ6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBlOiBKUXVlcnlFdmVudE9iamVjdCA9IGV2ZW50IHx8IDxKUXVlcnlFdmVudE9iamVjdD53aW5kb3cuZXZlbnQ7XHJcbiAgICAgICAgICAgIGxldCBjb2RlOiBudW1iZXI7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb24uRGlzYWJsZUluSW5wdXQpIHsgLy8gRGlzYWJsZSBzaG9ydGN1dCBrZXlzIGluIElucHV0LCBUZXh0YXJlYSBmaWVsZHNcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGUudGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlLnNyY0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZS5zcmNFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50Lm5vZGVUeXBlID09IDMpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQudGFnTmFtZSA9PSAnSU5QVVQnIHx8IGVsZW1lbnQudGFnTmFtZSA9PSAnVEVYVEFSRUEnKSByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gRmluZCBXaGljaCBrZXkgaXMgcHJlc3NlZFxyXG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gZS5rZXlDb2RlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUud2hpY2gpIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBlLndoaWNoO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgY2hhcmFjdGVyID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvZGUgPT0gMTg4KSBjaGFyYWN0ZXIgPSBcIixcIjsgLy8gSWYgdGhlIHVzZXIgcHJlc3Nlcywgd2hlbiB0aGUgdHlwZSBpcyBvbmtleWRvd25cclxuICAgICAgICAgICAgaWYgKGNvZGUgPT0gMTkwKSBjaGFyYWN0ZXIgPSBcIi5cIjsgLy8gSWYgdGhlIHVzZXIgcHJlc3Nlcywgd2hlbiB0aGUgdHlwZSBpcyBvbmtleWRvd25cclxuXHJcbiAgICAgICAgICAgIGxldCBrZXlzOiBzdHJpbmdbXSA9IHRoaXMuc2hvcmN1dC5zcGxpdChcIitcIik7XHJcbiAgICAgICAgICAgIC8vIEtleSBQcmVzc2VkIC0gY291bnRzIHRoZSBudW1iZXIgb2YgdmFsaWQga2V5cHJlc3NlcyAtIGlmIGl0IGlzIHNhbWUgYXMgdGhlIG51bWJlciBvZiBrZXlzLCB0aGUgc2hvcnRjdXQgZnVuY3Rpb24gaXMgaW52b2tlZFxyXG4gICAgICAgICAgICBsZXQga3A6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgICAgICBpZiAoZS5jdHJsS2V5KSB0aGlzLm1vZGlmaWVycy5jdHJsLnByZXNzZWQgPSBlLmN0cmxLZXk7XHJcbiAgICAgICAgICAgIGlmIChlLnNoaWZ0S2V5KSB0aGlzLm1vZGlmaWVycy5zaGlmdC5wcmVzc2VkID0gZS5zaGlmdEtleTtcclxuICAgICAgICAgICAgaWYgKGUuYWx0S2V5KSB0aGlzLm1vZGlmaWVycy5hbHQucHJlc3NlZCA9IGUuYWx0S2V5O1xyXG4gICAgICAgICAgICBpZiAoZS5tZXRhS2V5KSB0aGlzLm1vZGlmaWVycy5tZXRhLnByZXNzZWQgPSBlLm1ldGFLZXk7XHJcblxyXG4gICAgICAgICAgICBsZXQgaTogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBrOiBzdHJpbmcgPSBrZXlzW2ldO1xyXG4gICAgICAgICAgICAgICAgLy8gTW9kaWZpZXJzXHJcbiAgICAgICAgICAgICAgICBpZiAoayA9PSAnY3RybCcgfHwgayA9PSAnY29udHJvbCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmN0cmwud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoayA9PSAnc2hpZnQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5zaGlmdC53YW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrID09ICdhbHQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5hbHQud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoayA9PSAnbWV0YScpIHtcclxuICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLm1ldGEud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoay5sZW5ndGggPiAxKSB7IC8vIElmIGl0IGlzIGEgc3BlY2lhbCBrZXlcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zcGVjaWFsX2tleXNba10gPT0gY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb24uS2V5Y29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbi5LZXljb2RlID09IGNvZGUpIGtwKys7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyBUaGUgc3BlY2lhbCBrZXlzIGRpZCBub3QgbWF0Y2hcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhcmFjdGVyID09IGspIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNoaWZ0X251bXNbY2hhcmFjdGVyXSAmJiBlLnNoaWZ0S2V5KSB7IC8vIFN0dXBpZCBTaGlmdCBrZXkgYnVnIGNyZWF0ZWQgYnkgdXNpbmcgbG93ZXJjYXNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFyYWN0ZXIgPSB0aGlzLnNoaWZ0X251bXNbY2hhcmFjdGVyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGFyYWN0ZXIgPT0gaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChrcCA9PSBrZXlzLmxlbmd0aCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuY3RybC5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLmN0cmwud2FudGVkICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5zaGlmdC5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLnNoaWZ0LndhbnRlZCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuYWx0LnByZXNzZWQgPT0gdGhpcy5tb2RpZmllcnMuYWx0LndhbnRlZCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMubWV0YS5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLm1ldGEud2FudGVkKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMub3B0aW9uLlByb3BhZ2F0ZSkgeyAvLyBTdG9wIHRoZSBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGUuY2FuY2VsQnViYmxlIGlzIHN1cHBvcnRlZCBieSBJRSAtIHRoaXMgd2lsbCBraWxsIHRoZSBidWJibGluZyBwcm9jZXNzLlxyXG4gICAgICAgICAgICAgICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBlLnJldHVyblZhbHVlID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGUuc3RvcFByb3BhZ2F0aW9uIHdvcmtzIGluIEZpcmVmb3guXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5jdHJsLnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuc2hpZnQucHJlc3NlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5hbHQucHJlc3NlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5tZXRhLnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7IFNob3J0Y3V0LCBTaG9ydGN1dE9wdGlvbnMsIEtleWJvYXJkRXZlbnQgfSBmcm9tIFwiLi9TaG9ydGN1dFwiO1xyXG5pbXBvcnQgeyBJS2V5Ym9hcmRTaG9ydGN1dHMsIElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlLCBJU2hvcnRjdXRCaW5kaW5nUHJvdmlkZXIgfSBmcm9tICcuL0lTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlIGltcGxlbWVudHMgSVNob3J0Y3V0QmluZGluZ1NlcnZpY2Uge1xyXG4gICAgcHJpdmF0ZSBfbG9nOiBuZy5JTG9nU2VydmljZTtcclxuICAgIHByaXZhdGUgX2RlZmF1bHRPcHRpb246IFNob3J0Y3V0T3B0aW9ucztcclxuICAgIHByaXZhdGUgX3Nob3J0Y3V0czogSUtleWJvYXJkU2hvcnRjdXRzID0ge307XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgIG9wdGlvbjogU2hvcnRjdXRPcHRpb25zXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcbiAgICAgICAgdGhpcy5fbG9nID0gJGxvZztcclxuICAgICAgICB0aGlzLl9kZWZhdWx0T3B0aW9uID0gb3B0aW9uID8gXy5kZWZhdWx0cyhvcHRpb24sIHRoaXMuZ2V0RGVmYXVsdE9wdGlvbigpKSA6IHRoaXMuZ2V0RGVmYXVsdE9wdGlvbigpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0RGVmYXVsdE9wdGlvbigpOiBTaG9ydGN1dE9wdGlvbnMge1xyXG4gICAgICAgIGxldCBkZWZhdWx0T3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIFR5cGU6IEtleWJvYXJkRXZlbnQuS2V5ZG93bixcclxuICAgICAgICAgICAgUHJvcGFnYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgRGlzYWJsZUluSW5wdXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBUYXJnZXQ6IGRvY3VtZW50LFxyXG4gICAgICAgICAgICBLZXljb2RlOiBudWxsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRPcHRpb247XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBzaG9ydGN1dHMoKTogSUtleWJvYXJkU2hvcnRjdXRzIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhZGQoc2hvcnRjdXQ6IHN0cmluZywgY2FsbGJhY2s6IChlOiBKUXVlcnlFdmVudE9iamVjdCkgPT4gdm9pZCwgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnJlbW92ZShzaG9ydGN1dCk7XHJcbiAgICAgICAgbGV0IHNob3J0Y3V0T3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMgPSBvcHRpb24gPyBfLmRlZmF1bHRzKG9wdGlvbiwgdGhpcy5fZGVmYXVsdE9wdGlvbikgOiB0aGlzLl9kZWZhdWx0T3B0aW9uO1xyXG4gICAgICAgIGxldCBzaG9ydGN1dENvbWJpbmF0aW9uOiBzdHJpbmcgPSBzaG9ydGN1dC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgIGxldCBlbGVtZW50ID0gc2hvcnRjdXRPcHRpb24uVGFyZ2V0O1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIHNob3J0Y3V0T3B0aW9uLlRhcmdldCA9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2hvcnRjdXRPcHRpb24uVGFyZ2V0KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gc2hvcnRjdXRPcHRpb24uVGFyZ2V0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvZy5lcnJvcignUmVnaXN0ZXIgc2hvcnRjdXQ6IGVsZW1lbnQgdW5kZW50aWZpZWQhJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghc2hvcnRjdXRDb21iaW5hdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1JlZ2lzdGVyIHNob3J0Y3V0OiBzaG9ydGN1dCBjb21iaW5hdGlvbiB1bmRlbnRpZmllZCEnKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFjYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1JlZ2lzdGVyIHNob3J0Y3V0OiBzaG9yY3V0IGNhbGxiYWNrIHVuZGVudGlmaWVkIScpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbmV3S2V5Ym9hcmRTaG9ydGN1dCA9IG5ldyBTaG9ydGN1dChlbGVtZW50LCBzaG9ydGN1dENvbWJpbmF0aW9uLCBzaG9ydGN1dE9wdGlvbiwgY2FsbGJhY2spO1xyXG5cclxuICAgICAgICB0aGlzLl9zaG9ydGN1dHNbc2hvcnRjdXRDb21iaW5hdGlvbl0gPSBuZXdLZXlib2FyZFNob3J0Y3V0O1xyXG5cclxuICAgICAgICAvL0F0dGFjaCB0aGUgZnVuY3Rpb24gd2l0aCB0aGUgZXZlbnRcclxuICAgICAgICBpZiAoZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihzaG9ydGN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYXR0YWNoRXZlbnQpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5hdHRhY2hFdmVudCgnb24nICsgc2hvcnRjdXRPcHRpb24uVHlwZSwgbmV3S2V5Ym9hcmRTaG9ydGN1dC5ldmVudENhbGxiYWNrKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlbGVtZW50Lm9uKHNob3J0Y3V0T3B0aW9uLlR5cGUsIG5ld0tleWJvYXJkU2hvcnRjdXQuZXZlbnRDYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyByZW1vdmUoc2hvcmN1dDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IHNob3J0Y3V0Q29tYmluYXRpb24gPSBzaG9yY3V0LnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgbGV0IGJpbmRpbmc6IFNob3J0Y3V0ID0gdGhpcy5fc2hvcnRjdXRzW3Nob3J0Y3V0Q29tYmluYXRpb25dO1xyXG5cclxuICAgICAgICBkZWxldGUodGhpcy5fc2hvcnRjdXRzW3Nob3J0Y3V0Q29tYmluYXRpb25dKVxyXG4gICAgICAgIGlmICghYmluZGluZykgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgdHlwZSA9IGJpbmRpbmcuZXZlbnQ7XHJcbiAgICAgICAgbGV0IGVsZW1lbnQgPSBiaW5kaW5nLnRhcmdldDtcclxuICAgICAgICBsZXQgY2FsbGJhY2sgPSBiaW5kaW5nLmV2ZW50Q2FsbGJhY2s7XHJcblxyXG4gICAgICAgIGlmIChlbGVtZW50LmRldGFjaEV2ZW50KSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuZGV0YWNoRXZlbnQoJ29uJyArIHR5cGUsIGNhbGxiYWNrKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xyXG4gICAgICAgICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBlbGVtZW50WydvbicgKyB0eXBlXSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBlbGVtZW50Lm9mZih0eXBlLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTaG9ydGN1dEJpbmRpbmdQcm92aWRlciBpbXBsZW1lbnRzIElTaG9ydGN1dEJpbmRpbmdQcm92aWRlciB7XHJcbiAgICBwcml2YXRlIF9zZXJ2aWNlOiBTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlO1xyXG4gICAgcHJpdmF0ZSBfb3B0aW9uOiBTaG9ydGN1dE9wdGlvbnM7XHJcblxyXG4gICAgcHVibGljIGdldCBvcHRpb24oKTogU2hvcnRjdXRPcHRpb25zIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fb3B0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgb3B0aW9uKHZhbHVlOiBTaG9ydGN1dE9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLl9vcHRpb24gPSB2YWx1ZSB8fCBuZXcgU2hvcnRjdXRPcHRpb25zKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljICRnZXQoXHJcbiAgICAgICAgJGxvZzogbmcuSUxvZ1NlcnZpY2VcclxuICAgICkge1xyXG4gICAgICAgIFwibmdJbmplY3RcIjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX3NlcnZpY2UgPT0gbnVsbClcclxuICAgICAgICAgICAgdGhpcy5fc2VydmljZSA9IG5ldyBTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlKCRsb2csIHRoaXMuX29wdGlvbik7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLl9zZXJ2aWNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5hbmd1bGFyXHJcbiAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgLnByb3ZpZGVyKCdwaXBTaG9ydGN1dEJpbmRpbmcnLCBTaG9ydGN1dEJpbmRpbmdQcm92aWRlcik7XHJcbiIsImltcG9ydCB7IFNob3J0Y3V0T3B0aW9ucyB9IGZyb20gXCIuL1Nob3J0Y3V0XCI7XHJcbmltcG9ydCB7IElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlIH0gZnJvbSBcIi4vSVNob3J0Y3V0QmluZGluZ1NlcnZpY2VcIjtcclxuXHJcbmludGVyZmFjZSBTaG9ydGN1dEF0dHJpYnV0ZXMgZXh0ZW5kcyBuZy5JQXR0cmlidXRlcyB7XHJcbiAgICBwaXBTaG9ydGN1dEFjdGlvbjogYW55O1xyXG4gICAgcGlwU2hvcnRjdXROYW1lOiBhbnk7XHJcbiAgICBwaXBTaG9yY3V0T3B0aW9uczogU2hvcnRjdXRPcHRpb25zO1xyXG59XHJcblxyXG5jbGFzcyBTaG9ydGN1dENvbnRyb2xsZXIgaW1wbGVtZW50cyBuZy5JQ29udHJvbGxlciAge1xyXG4gICAgcHJpdmF0ZSBhY3Rpb25TaG9ydGN1dHM6IEZ1bmN0aW9uO1xyXG4gICAgcHJpdmF0ZSBuYW1lU2hvcnRjdXRzOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIG9wdGlvbnM6IFNob3J0Y3V0T3B0aW9ucztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICRhdHRyczogU2hvcnRjdXRBdHRyaWJ1dGVzLFxyXG4gICAgICAgICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICBwaXBTaG9ydGN1dEJpbmRpbmc6IElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgIGlmICgkYXR0cnMucGlwU2hvcnRjdXRBY3Rpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMgPSAkcGFyc2UoJGF0dHJzLnBpcFNob3J0Y3V0QWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMoJHNjb3BlLCB7JGV2ZW50OiB7fX0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICRsb2cuZXJyb3IoJ1Nob3J0Y3V0IGFjdGlvbiBkb2VzIG5vdCBzZXQuJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICgkYXR0cnMucGlwU2hvcnRjdXROYW1lICYmIF8uaXNTdHJpbmcoJGF0dHJzLnBpcFNob3J0Y3V0TmFtZSkpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lU2hvcnRjdXRzID0gJGF0dHJzLnBpcFNob3J0Y3V0TmFtZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAkbG9nLmVycm9yKCdTaG9ydGN1dCBuYW1lIGRvZXMgbm90IHNldC4nKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5vcHRpb25zID0gJGF0dHJzLnBpcFNob3JjdXRPcHRpb25zID8gPFNob3J0Y3V0T3B0aW9ucz4kYXR0cnMucGlwU2hvcmN1dE9wdGlvbnMgOiA8U2hvcnRjdXRPcHRpb25zPnt9O1xyXG4gICAgICAgIHRoaXMub3B0aW9ucy5UYXJnZXQgPSAkZWxlbWVudDtcclxuICAgICAgICBcclxuICAgICAgICAvLyBSZWdpc3RyYXRpb24gb2Yga2V5Ym9yZCBzaG9ydGN1dHNcclxuICAgICAgICBwaXBTaG9ydGN1dEJpbmRpbmcuYWRkKHRoaXMubmFtZVNob3J0Y3V0cywgKGU/OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMoJHNjb3BlLCB7JGV2ZW50OiB7J2UnOiBlfX0pOyAgICAgICAgICBcclxuICAgICAgICB9LCB0aGlzLm9wdGlvbnMpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUga2V5cHJlc3NTaG9ydGN1dChhY3Rpb24pIHtcclxuICAgICAgICB0aGlzLmFjdGlvblNob3J0Y3V0cygpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBQcmV2ZW50IGp1bmsgZnJvbSBnb2luZyBpbnRvIHR5cGVzY3JpcHQgZGVmaW5pdGlvbnNcclxue1xyXG4gICAgY29uc3Qgc2hvcnRjdXRzRGlyZWN0aXZlID0gZnVuY3Rpb24oKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLCAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiBTaG9ydGN1dENvbnRyb2xsZXJcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcFNob3J0Y3V0Jywgc2hvcnRjdXRzRGlyZWN0aXZlKTtcclxufSIsImltcG9ydCB7IElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlIH0gZnJvbSBcIi4vSVNob3J0Y3V0QmluZGluZ1NlcnZpY2VcIlxyXG5pbXBvcnQgeyBTaG9ydGN1dCwgU2hvcnRjdXRPcHRpb25zLCBLZXlib2FyZEV2ZW50IH0gZnJvbSBcIi4vU2hvcnRjdXRcIjtcclxuaW1wb3J0IHsgU2hvcnRjdXRzQ29uZmlnLCBTaG9ydGN1dEl0ZW0sIElTaG9ydGN1dHNTZXJ2aWNlLCBJU2hvcnRjdXRzUHJvdmlkZXIgfSBmcm9tICcuL0lTaG9ydGN1dHNTZXJ2aWNlJztcclxuXHJcbmV4cG9ydCBsZXQgU2hvcnRjdXRzQ2hhbmdlZEV2ZW50ID0gJ3BpcFNob3J0Y3V0c0NoYW5nZWQnO1xyXG5cclxuY2xhc3MgU2hvcnRjdXRzU2VydmljZSBpbXBsZW1lbnRzIElTaG9ydGN1dHNTZXJ2aWNlIHtcclxuICAgIHByaXZhdGUgX29sZENvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG4gICAgcHJpdmF0ZSBfY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIGNvbmZpZzogU2hvcnRjdXRzQ29uZmlnLFxyXG4gICAgICAgIHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSwgXHJcbiAgICAgICAgcHJpdmF0ZSAkbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2UsIFxyXG4gICAgICAgIHByaXZhdGUgJGluamVjdG9yOiBuZy5hdXRvLklJbmplY3RvclNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSBwaXBTaG9ydGN1dEJpbmRpbmc6IElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICB0aGlzLl9jb25maWcgPSBjb25maWc7XHJcbiAgICAgICAgdGhpcy5fb2xkQ29uZmlnID0gXy5jbG9uZURlZXAodGhpcy5fY29uZmlnKTtcclxuXHJcbiAgICAgICAgLy8gQWRkIHNob3J0Y3V0c1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyk7ICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICAvLyBEZXNjcmliZSBwcml2YXRlIGZ1bmN0aW9uc1xyXG4gICAgcHJpdmF0ZSBzZW5kQ2hhbmdlRXZlbnQoKSB7XHJcbiAgICAgICAgLy8gUmVtb3ZlIHNob3J0Y3V0c1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2hvcnRjdXRzKHRoaXMuX29sZENvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2hvcnRjdXRzKHRoaXMuX29sZENvbmZpZy5sb2NhbFNob3J0Y3V0cyk7XHJcblxyXG4gICAgICAgIC8vIEFkZCBzaG9ydGN1dHNcclxuICAgICAgICB0aGlzLmFkZFNob3J0Y3V0cyh0aGlzLmNvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuY29uZmlnLmxvY2FsU2hvcnRjdXRzKTtcclxuXHJcbiAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRlbWl0KFNob3J0Y3V0c0NoYW5nZWRFdmVudCwgdGhpcy5jb25maWcpO1xyXG5cclxuICAgICAgICAvLyBTYXZlIGN1cnJlbnQgY29uZmlnIHRvIG9sZENvbmZpZ1xyXG4gICAgICAgIHRoaXMuX29sZENvbmZpZyA9IF8uY2xvbmVEZWVwKHRoaXMuY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZVNob3J0Y3V0cyhjb2xsZWN0aW9uOiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQge1xyXG4gICAgICAgIF8uZWFjaChjb2xsZWN0aW9uLCAoaykgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBpcFNob3J0Y3V0QmluZGluZy5yZW1vdmUoay5zaG9ydGN1dCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBrZXlwcmVzc1Nob3J0Y3V0KGl0ZW06IFNob3J0Y3V0SXRlbSwgZXZlbnQ6IEpRdWVyeUV2ZW50T2JqZWN0KSB7XHJcbiAgICAgICAgaWYgKGl0ZW0uYWNjZXNzICYmIF8uaXNGdW5jdGlvbihpdGVtLmFjY2VzcykpIHtcclxuICAgICAgICAgICAgaWYgKCFpdGVtLmFjY2VzcyhldmVudCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gXHJcblxyXG4gICAgICAgIGlmIChpdGVtLmtleXByZXNzKSB7XHJcbiAgICAgICAgICAgIGl0ZW0ua2V5cHJlc3MoZXZlbnQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlbS5ocmVmKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gaXRlbS5ocmVmO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlbS51cmwpIHtcclxuICAgICAgICAgICAgdGhpcy4kbG9jYXRpb24udXJsKGl0ZW0udXJsKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZW0uc3RhdGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJGluamVjdG9yLmhhcygnJHN0YXRlJykpIHtcclxuICAgICAgICAgICAgICAgIHZhciAkc3RhdGUgPSB0aGlzLiRpbmplY3Rvci5nZXQoJyRzdGF0ZScpO1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlWydnbyddKGl0ZW0uc3RhdGUsIGl0ZW0uc3RhdGVQYXJhbXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVtLmV2ZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KGl0ZW0uZXZlbnQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSByYWlzZSBub3RpZmljYXRpb25cclxuICAgICAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3BpcFNob3J0Y3V0S2V5cHJlc3MnLCBpdGVtLnNob3J0Y3V0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhZGRTaG9ydGN1dHMoY29sbGVjdGlvbjogU2hvcnRjdXRJdGVtW10pOiB2b2lkIHtcclxuICAgICAgICBsZXQgZ2VuZXJhbE9wdGlvbnM6IFNob3J0Y3V0T3B0aW9ucyA9IHRoaXMuY29uZmlnLmRlZmF1bHRPcHRpb25zID8gdGhpcy5jb25maWcuZGVmYXVsdE9wdGlvbnMgOiA8U2hvcnRjdXRPcHRpb25zPnt9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIF8uZWFjaChjb2xsZWN0aW9uLCAoaykgPT4ge1xyXG4gICAgICAgICAgICBsZXQgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMgPSBrLm9wdGlvbnMgPyBrLm9wdGlvbnMgOiBnZW5lcmFsT3B0aW9ucztcclxuICAgICAgICAgICAgbGV0IHRhcmdldDogYW55O1xyXG5cclxuICAgICAgICAgICAgdGFyZ2V0ID0gay50YXJnZXQgPyBrLnRhcmdldCA6IGsudGFyZ2V0SWQ7XHJcbiAgICAgICAgICAgIG9wdGlvbi5UYXJnZXQgPSB0YXJnZXQ7XHJcbiAgICAgICAgICAgIC8vIFJlZ2lzdHJhdGlvbiBvZiBrZXlib2FyZCBzaG9ydGN1dFxyXG4gICAgICAgICAgICB0aGlzLnBpcFNob3J0Y3V0QmluZGluZy5hZGQoay5zaG9ydGN1dCwgKGU/OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMua2V5cHJlc3NTaG9ydGN1dChrLCBlKTsgICAgICAgIFxyXG4gICAgICAgICAgICB9LCBvcHRpb24pOyAgICAgICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVzY3JpYmUgcHVibGljIGZ1bmN0aW9ucyBcclxuICAgIHB1YmxpYyBnZXQgY29uZmlnKCk6IFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGRlZmF1bHRPcHRpb25zKCk6IFNob3J0Y3V0T3B0aW9ucyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5kZWZhdWx0T3B0aW9ucztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGRlZmF1bHRPcHRpb25zKHZhbHVlOiBTaG9ydGN1dE9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnMgPSB2YWx1ZSB8fCBudWxsO1xyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBnbG9iYWxTaG9ydGN1dHMoKTogU2hvcnRjdXRJdGVtW10ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgZ2xvYmFsU2hvcnRjdXRzKHZhbHVlOiBTaG9ydGN1dEl0ZW1bXSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMgPSB2YWx1ZSB8fCBbXTtcclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgbG9jYWxTaG9ydGN1dHMoKTogU2hvcnRjdXRJdGVtW10ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBsb2NhbFNob3J0Y3V0cyh2YWx1ZTogU2hvcnRjdXRJdGVtW10pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHMgPSB2YWx1ZSB8fCBbXTtcclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTaG9ydGN1dHNQcm92aWRlciBpbXBsZW1lbnRzIElTaG9ydGN1dHNQcm92aWRlciB7XHJcbiAgICBwcml2YXRlIF9jb25maWc6IFNob3J0Y3V0c0NvbmZpZyA9IG5ldyBTaG9ydGN1dHNDb25maWcoKTtcclxuICAgIHByaXZhdGUgX3NlcnZpY2U6IFNob3J0Y3V0c1NlcnZpY2U7XHJcblxyXG4gICAgcHVibGljIGdldCBjb25maWcoKTogU2hvcnRjdXRzQ29uZmlnIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgY29uZmlnKHZhbHVlOiBTaG9ydGN1dHNDb25maWcpIHtcclxuICAgICAgICB0aGlzLl9jb25maWcgPSB2YWx1ZSB8fCBuZXcgU2hvcnRjdXRzQ29uZmlnKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBkZWZhdWx0T3B0aW9ucygpOiBTaG9ydGN1dE9wdGlvbnMge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBkZWZhdWx0T3B0aW9ucyh2YWx1ZTogU2hvcnRjdXRPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmRlZmF1bHRPcHRpb25zID0gdmFsdWUgfHwgbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGdsb2JhbFNob3J0Y3V0cygpOiBTaG9ydGN1dEl0ZW1bXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBnbG9iYWxTaG9ydGN1dHModmFsdWU6IFNob3J0Y3V0SXRlbVtdKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cyA9IHZhbHVlIHx8IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyAkZ2V0KFxyXG4gICAgICAgICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLCBcclxuICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSwgXHJcbiAgICAgICAgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLCBcclxuICAgICAgICAkaW5qZWN0b3I6IG5nLmF1dG8uSUluamVjdG9yU2VydmljZSxcclxuICAgICAgICBwaXBTaG9ydGN1dEJpbmRpbmc6IElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9zZXJ2aWNlID09IG51bGwpXHJcbiAgICAgICAgICAgIHRoaXMuX3NlcnZpY2UgPSBuZXcgU2hvcnRjdXRzU2VydmljZSh0aGlzLl9jb25maWcsICRyb290U2NvcGUsICR3aW5kb3csICRsb2NhdGlvbiwgJGluamVjdG9yLCBwaXBTaG9ydGN1dEJpbmRpbmcpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9zZXJ2aWNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5hbmd1bGFyXHJcbiAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgLnByb3ZpZGVyKCdwaXBTaG9ydGN1dHMnLCBTaG9ydGN1dHNQcm92aWRlcik7XHJcblxyXG4iLCJhbmd1bGFyLm1vZHVsZSgncGlwU2hvcnRjdXRzJywgWyduZ01hdGVyaWFsJywgJ3VpLnJvdXRlciddKTtcclxuXHJcbmltcG9ydCAnLi9TaG9ydGN1dEJpbmRpbmdTZXJ2aWNlJztcclxuaW1wb3J0ICcuL1Nob3J0Y3V0c1NlcnZpY2UnO1xyXG5pbXBvcnQgJy4vU2hvcnRjdXREaXJlY3RpdmUnO1xyXG5cclxuZXhwb3J0ICogZnJvbSAnLi9JU2hvcnRjdXRzU2VydmljZSc7XHJcbmV4cG9ydCAqIGZyb20gJy4vSVNob3J0Y3V0QmluZGluZ1NlcnZpY2UnO1xyXG5leHBvcnQgKiBmcm9tICcuL1Nob3J0Y3V0c1NlcnZpY2UnO1xyXG5leHBvcnQgKiBmcm9tICcuL1Nob3J0Y3V0QmluZGluZ1NlcnZpY2UnOyIsIntcclxuICAgIGludGVyZmFjZSBVbnNhdmVkQ2hhbmdlc1Njb3BlIGV4dGVuZHMgbmcuSVNjb3BlIHtcclxuICAgICAgICB1bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZTogRnVuY3Rpb247XHJcbiAgICAgICAgdW5zYXZlZENoYW5nZXNNZXNzYWdlOiBzdHJpbmc7XHJcbiAgICAgICAgY2FuY2VsTGVhdmU6IEZ1bmN0aW9uO1xyXG4gICAgICAgIGFmdGVyTGVhdmU6IEZ1bmN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIFVuc2F2ZWRDaGFuZ2VzTGluayB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgICRzY29wZTogVW5zYXZlZENoYW5nZXNTY29wZSxcclxuICAgICAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgJHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUudW5zYXZlZENoYW5nZXNBdmFpbGFibGUoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdW5iaW5kRnVuYyA9ICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlKCkgJiYgISR3aW5kb3cuY29uZmlybSgkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbigkc2NvcGUuY2FuY2VsTGVhdmUpICYmICRzY29wZS5jYW5jZWxMZWF2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbigkc2NvcGUuYWZ0ZXJMZWF2ZSkgJiYgJHNjb3BlLmFmdGVyTGVhdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICR3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdW5iaW5kRnVuYygpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgVW5zYXZlZENoYW5nZXMgPSBmdW5jdGlvbiAoJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0FFJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlJyxcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzTWVzc2FnZTogJ0BwaXBVbnNhdmVkQ2hhbmdlc01lc3NhZ2UnLFxyXG4gICAgICAgICAgICAgICAgYWZ0ZXJMZWF2ZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0FmdGVyTGVhdmUnLFxyXG4gICAgICAgICAgICAgICAgY2FuY2VsTGVhdmU6ICcmcGlwVW5zYXZlZENoYW5nZXNDYW5jZWxMZWF2ZSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZTogVW5zYXZlZENoYW5nZXNTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgbmV3IFVuc2F2ZWRDaGFuZ2VzTGluaygkc2NvcGUsICR3aW5kb3cpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcInBpcFVuc2F2ZWRDaGFuZ2VzXCIsIFtdKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoXCJwaXBVbnNhdmVkQ2hhbmdlc1wiLCBVbnNhdmVkQ2hhbmdlcyk7XHJcbn0iXX0=