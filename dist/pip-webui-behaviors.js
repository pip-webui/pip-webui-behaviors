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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZHJhZ2dhYmxlL0NhbmNlbERyYWcudHMiLCJzcmMvZHJhZ2dhYmxlL0RyYWcudHMiLCJzcmMvZHJhZ2dhYmxlL0RyYWdnYWJsZVNlcnZpY2UudHMiLCJzcmMvZHJhZ2dhYmxlL0Ryb3AudHMiLCJzcmMvZHJhZ2dhYmxlL1ByZXZlbnREcmFnLnRzIiwic3JjL2RyYWdnYWJsZS9pbmRleC50cyIsInNyYy9mb2N1c2VkL2ZvY3VzZWQudHMiLCJzcmMvaW5kZXgudHMiLCJzcmMvaW5maW5pdGVfc2Nyb2xsL2luZmluaXRlU2Nyb2xsLnRzIiwic3JjL3NlbGVjdGVkL3NlbGVjdGVkLnRzIiwic3JjL3Nob3J0Y3V0cy9JU2hvcnRjdXRzU2VydmljZS50cyIsInNyYy9zaG9ydGN1dHMvU2hvcnRjdXQudHMiLCJzcmMvc2hvcnRjdXRzL1Nob3J0Y3V0QmluZGluZ1NlcnZpY2UudHMiLCJzcmMvc2hvcnRjdXRzL1Nob3J0Y3V0RGlyZWN0aXZlLnRzIiwic3JjL3Nob3J0Y3V0cy9TaG9ydGN1dHNTZXJ2aWNlLnRzIiwic3JjL3Nob3J0Y3V0cy9pbmRleC50cyIsInNyYy91bnNhdmVkX2NoYW5nZXMvdW5zYXZlZENoYW5nZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxDQUFDO0lBQ0c7UUFDSSwwQkFDSSxRQUFnQjtZQUVoQixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFDTCx1QkFBQztJQUFELENBTkEsQUFNQyxJQUFBO0lBRUQsSUFBTSxVQUFVLEdBQUc7UUFDZixNQUFNLENBQUM7WUFDSCxRQUFRLEVBQUUsR0FBRztZQUNiLElBQUksRUFBRSxVQUNGLE1BQWlCLEVBQ2pCLFFBQWdCLEVBQ2hCLE1BQXNCO2dCQUV0QixJQUFJLGdCQUFjLENBQUMs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QUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUU7Z0JBQ25CLE9BQU8sQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO2dCQUM5QixVQUFVLEVBQUUsQ0FBQztZQUNqQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFDTCwyQkFBQztJQUFELENBekJBLEFBeUJDLElBQUE7SUFFRCxJQUFNLGNBQWMsR0FBRyxVQUFVLE9BQTBCO1FBQ3ZELE1BQU0sQ0FBQztZQUNILFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFO2dCQUNILHVCQUF1QixFQUFFLDZCQUE2QjtnQkFDdEQscUJBQXFCLEVBQUUsMkJBQTJCO2dCQUNsRCxVQUFVLEVBQUUsOEJBQThCO2dCQUMxQyxXQUFXLEVBQUUsK0JBQStCO2FBQy9DO1lBQ0QsSUFBSSxFQUFFLFVBQVUsTUFBMkI7Z0JBQ3ZDLElBQUksb0JBQWtCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLENBQUM7U0FDSixDQUFDO0lBQ04sQ0FBQyxDQUFBO0lBRUQsT0FBTztTQUNGLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7U0FDL0IsU0FBUyxDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQ3hELENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwie1xyXG4gICAgY2xhc3MgQ2FuY2VsRHJhZ0xpbmsge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICRlbGVtZW50LmZpbmQoJyonKS5hdHRyKCdwaXAtY2FuY2VsLWRyYWcnLCAncGlwLWNhbmNlbC1kcmFnJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IENhbmNlbERyYWcgPSBmdW5jdGlvbiAoKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAgICAgJGF0dHJzOiBuZy5JQXR0cmlidXRlc1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIG5ldyBDYW5jZWxEcmFnTGluaygkZWxlbWVudCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIilcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBDYW5jZWxEcmFnJywgQ2FuY2VsRHJhZyk7XHJcbn0iLCJpbXBvcnQgeyBJRHJhZ2dhYmxlU2VydmljZSB9IGZyb20gJy4vRHJhZ2dhYmxlU2VydmljZSc7XHJcblxyXG57XHJcbiAgICBpbnRlcmZhY2UgSURyYWdMaW5rU2NvcGUgZXh0ZW5kcyBuZy5JU2NvcGUge1xyXG4gICAgICAgIHZhbHVlOiBhbnk7XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIElEcmFnTGlua0F0dHJpYnV0ZXMgZXh0ZW5kcyBuZy5JQXR0cmlidXRlcyB7XHJcbiAgICAgICAgbmdEcmFnOiBhbnk7XHJcbiAgICAgICAgcGlwRHJhZ1N0YXJ0OiBhbnk7XHJcbiAgICAgICAgcGlwRHJhZ1N0b3A6IGFueTtcclxuICAgICAgICBwaXBEcmFnU3VjY2VzczogYW55O1xyXG4gICAgICAgIGFsbG93VHJhbnNmb3JtOiBhbnk7XHJcbiAgICAgICAgcGlwRHJhZ0RhdGE6IGFueTtcclxuICAgICAgICBwaXBWZXJ0aWNhbFNjcm9sbDogYW55O1xyXG4gICAgICAgIHBpcEhvcml6b250YWxTY3JvbGw6IGFueTtcclxuICAgICAgICBwaXBBY3RpdmF0aW9uRGlzdGFuY2U6IGFueTtcclxuICAgICAgICBwaXBTY3JvbGxDb250YWluZXI6IGFueTtcclxuICAgICAgICBwaXBEcmFnOiBhbnk7XHJcbiAgICAgICAgcGlwQ2VudGVyQW5jaG9yOiBhbnk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgRHJhZ0xpbmsge1xyXG4gICAgICAgIHByaXZhdGUgTE9OR19QUkVTUzogbnVtYmVyID0gNTA7IC8vIDUwbXMgZm9yIGxvbmdwcmVzc1xyXG4gICAgICAgIHByaXZhdGUgb2Zmc2V0OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBfY2VudGVyQW5jaG9yOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcHJpdmF0ZSBfbXg6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIF9teTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX3R4OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBfdHk6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIF9tcng6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIF9tcnk6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIF9oYXNUb3VjaDogYm9vbGVhbiA9ICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpIHx8ICggPCBhbnkgPiB3aW5kb3cpLkRvY3VtZW50VG91Y2g7IC8vICYmIGRvY3VtZW50IGluc3RhbmNlb2YgRG9jdW1lbnRUb3VjaDsgLy8gRG9jdW1lbnRUb3VjaCBpcyBub3QgZGVmaW5lZCFcclxuICAgICAgICBwcml2YXRlIF9wcmVzc0V2ZW50czogc3RyaW5nID0gJ3RvdWNoc3RhcnQgbW91c2Vkb3duJztcclxuICAgICAgICBwcml2YXRlIF9tb3ZlRXZlbnRzOiBzdHJpbmcgPSAndG91Y2htb3ZlIG1vdXNlbW92ZSc7XHJcbiAgICAgICAgcHJpdmF0ZSBfcmVsZWFzZUV2ZW50czogc3RyaW5nID0gJ3RvdWNoZW5kIG1vdXNldXAnO1xyXG4gICAgICAgIHByaXZhdGUgX2RyYWdIYW5kbGU6IGFueTtcclxuXHJcbiAgICAgICAgLy8gdG8gaWRlbnRpZnkgdGhlIGVsZW1lbnQgaW4gb3JkZXIgdG8gcHJldmVudCBnZXR0aW5nIHN1cGVyZmxvdXMgZXZlbnRzIHdoZW4gYSBzaW5nbGUgZWxlbWVudCBoYXMgYm90aCBkcmFnIGFuZCBkcm9wIGRpcmVjdGl2ZXMgb24gaXQuXHJcbiAgICAgICAgcHJpdmF0ZSBfbXlpZDogc3RyaW5nIHwgbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX2RhdGE6IGFueSA9IG51bGw7XHJcblxyXG4gICAgICAgIHByaXZhdGUgX2RyYWdPZmZzZXQ6IGFueSA9IG51bGw7XHJcblxyXG4gICAgICAgIHByaXZhdGUgX2RyYWdFbmFibGVkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHByaXZhdGUgX3ByZXNzVGltZXI6IGFueSA9IG51bGw7XHJcblxyXG4gICAgICAgIHByaXZhdGUgX2VsZW1lbnRTdHlsZTogYW55ID0ge307XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25EcmFnU3RhcnRDYWxsYmFjazogRnVuY3Rpb247XHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdTdG9wQ2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHByaXZhdGUgb25EcmFnU3VjY2Vzc0NhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgICAgICBwcml2YXRlIGFsbG93VHJhbnNmb3JtOiBib29sZWFuO1xyXG5cclxuICAgICAgICBwcml2YXRlIGdldERyYWdEYXRhOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSB2ZXJ0aWNhbFNjcm9sbDogYm9vbGVhbjtcclxuICAgICAgICBwcml2YXRlIGhvcml6b250YWxTY3JvbGw6IGJvb2xlYW47XHJcbiAgICAgICAgcHJpdmF0ZSBhY3RpdmF0aW9uRGlzdGFuY2U6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIHNjcm9sbERpc3RhbmNlOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxQYXJlbnQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxDb250YWluZXI6IEpRdWVyeSA9IGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpO1xyXG4gICAgICAgIHByaXZhdGUgc2Nyb2xsQ29udGFpbmVyR2V0dGVyOiBhbnk7XHJcblxyXG4gICAgICAgIC8vIGRlcmVnaXN0cmF0aW9uIGZ1bmN0aW9uIGZvciBtb3VzZSBtb3ZlIGV2ZW50cyBpbiAkcm9vdFNjb3BlIHRyaWdnZXJlZCBieSBqcUxpdGUgdHJpZ2dlciBoYW5kbGVyXHJcbiAgICAgICAgcHJpdmF0ZSBfZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXI6IEZ1bmN0aW9uID0gYW5ndWxhci5ub29wO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcGFyc2U6IG5nLklQYXJzZVNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGRvY3VtZW50OiBuZy5JRG9jdW1lbnRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIHBpcERyYWdnYWJsZTogSURyYWdnYWJsZVNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHNjb3BlOiBJRHJhZ0xpbmtTY29wZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICBwcml2YXRlICRhdHRyczogSURyYWdMaW5rQXR0cmlidXRlc1xyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICAkc2NvcGUudmFsdWUgPSAkYXR0cnMubmdEcmFnO1xyXG4gICAgICAgICAgICB0aGlzLl9teWlkID0gJHNjb3BlLiRpZDtcclxuICAgICAgICAgICAgdGhpcy5vbkRyYWdTdGFydENhbGxiYWNrID0gJHBhcnNlKCRhdHRycy5waXBEcmFnU3RhcnQpIHx8IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMub25EcmFnU3RvcENhbGxiYWNrID0gJHBhcnNlKCRhdHRycy5waXBEcmFnU3RvcCkgfHwgbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5vbkRyYWdTdWNjZXNzQ2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdTdWNjZXNzKSB8fCBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmFsbG93VHJhbnNmb3JtID0gYW5ndWxhci5pc0RlZmluZWQoJGF0dHJzLmFsbG93VHJhbnNmb3JtKSA/ICRzY29wZS4kZXZhbCgkYXR0cnMuYWxsb3dUcmFuc2Zvcm0pIDogZmFsc2U7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldERyYWdEYXRhID0gJHBhcnNlKCRhdHRycy5waXBEcmFnRGF0YSk7XHJcbiAgICAgICAgICAgIHRoaXMudmVydGljYWxTY3JvbGwgPSAkYXR0cnMucGlwVmVydGljYWxTY3JvbGwgfHwgdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5ob3Jpem9udGFsU2Nyb2xsID0gJGF0dHJzLnBpcEhvcml6b250YWxTY3JvbGwgfHwgdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5hY3RpdmF0aW9uRGlzdGFuY2UgPSBwYXJzZUZsb2F0KCRhdHRycy5waXBBY3RpdmF0aW9uRGlzdGFuY2UpIHx8IDc1O1xyXG4gICAgICAgICAgICB0aGlzLnNjcm9sbERpc3RhbmNlID0gcGFyc2VGbG9hdCgkYXR0cnMucGlwQWN0aXZhdGlvbkRpc3RhbmNlKSB8fCA1MDtcclxuICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXJHZXR0ZXIgPSAkcGFyc2UoJGF0dHJzLnBpcFNjcm9sbENvbnRhaW5lcik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LmNzcygnY3Vyc29yJywgJ21vdmUnKTtcclxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuYXR0cigncGlwLWRyYWdnYWJsZScsICdmYWxzZScpOyAvLyBwcmV2ZW50IG5hdGl2ZSBkcmFnXHJcbiAgICAgICAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiBkcmFnIGhhbmRsZShzKSB3YXMgc3BlY2lmaWVkXHJcbiAgICAgICAgICAgIC8vIGlmIHF1ZXJ5U2VsZWN0b3JBbGwgaXMgYXZhaWxhYmxlLCB3ZSB1c2UgdGhpcyBpbnN0ZWFkIG9mIGZpbmRcclxuICAgICAgICAgICAgLy8gYXMgSlFMaXRlIGZpbmQgaXMgbGltaXRlZCB0byB0YWduYW1lc1xyXG4gICAgICAgICAgICBsZXQgZHJhZ0hhbmRsZXM6IGFueTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJGVsZW1lbnRbMF0ucXVlcnlTZWxlY3RvckFsbCkge1xyXG4gICAgICAgICAgICAgICAgZHJhZ0hhbmRsZXMgPSBhbmd1bGFyLmVsZW1lbnQodGhpcy4kZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yQWxsKCdbcGlwLWRyYWctaGFuZGxlXScpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRyYWdIYW5kbGVzID0gdGhpcy4kZWxlbWVudC5maW5kKCdbcGlwLWRyYWctaGFuZGxlXScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChkcmFnSGFuZGxlcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2RyYWdIYW5kbGUgPSBkcmFnSGFuZGxlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgc2Nyb2xsIGNvbnRhaW5lclxyXG4gICAgICAgICAgICBpZiAodGhpcy5zY3JvbGxQYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHRoaXMuJGVsZW1lbnQucGFyZW50KCkpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuJGF0dHJzLnBpcFNjcm9sbENvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQodGhpcy5zY3JvbGxDb250YWluZXJHZXR0ZXIodGhpcy4kc2NvcGUpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KHdpbmRvdyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgdG9nZ2xlTGlzdGVuZXJzKGVuYWJsZSkge1xyXG4gICAgICAgICAgICBpZiAoIWVuYWJsZSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG5cclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25EZXN0cm95KGVuYWJsZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kd2F0Y2godGhpcy4kYXR0cnMucGlwRHJhZywgKG5ld1ZhbCwgb2xkVmFsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRW5hYmxlQ2hhbmdlKG5ld1ZhbCwgb2xkVmFsKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiR3YXRjaCh0aGlzLiRhdHRycy5waXBDZW50ZXJBbmNob3IsIChuZXdWYWwsIG9sZFZhbCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkNlbnRlckFuY2hvcihuZXdWYWwsIG9sZFZhbCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyB3aXJlIHVwIHRvdWNoIGV2ZW50c1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fZHJhZ0hhbmRsZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gaGFuZGxlKHMpIHNwZWNpZmllZCwgdXNlIHRob3NlIHRvIGluaXRpYXRlIGRyYWdcclxuICAgICAgICAgICAgICAgIHRoaXMuX2RyYWdIYW5kbGUub24odGhpcy5fcHJlc3NFdmVudHMsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25wcmVzcyhldmVudCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIG5vIGhhbmRsZShzKSBzcGVjaWZpZWQsIHVzZSB0aGUgZWxlbWVudCBhcyB0aGUgaGFuZGxlXHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50Lm9uKHRoaXMuX3ByZXNzRXZlbnRzLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9ucHJlc3MoZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9oYXNUb3VjaCAmJiB0aGlzLiRlbGVtZW50WzBdLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT0gXCJpbWdcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2Vkb3duJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH0pOyAvLyBwcmV2ZW50IG5hdGl2ZSBkcmFnIGZvciBpbWFnZXNcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRlc3Ryb3koZW5hYmxlKSB7XHJcbiAgICAgICAgICAgIHRoaXMudG9nZ2xlTGlzdGVuZXJzKGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgdGhpcy5fZHJhZ0VuYWJsZWQgPSAobmV3VmFsKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25DZW50ZXJBbmNob3IobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKG5ld1ZhbCkpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9jZW50ZXJBbmNob3IgPSAobmV3VmFsIHx8ICd0cnVlJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGlzQ2xpY2thYmxlRWxlbWVudChldnQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgIGFuZ3VsYXIuaXNEZWZpbmVkKGFuZ3VsYXIuZWxlbWVudChldnQudGFyZ2V0KS5hdHRyKFwicGlwLWNhbmNlbC1kcmFnXCIpKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICAgKiBXaGVuIHRoZSBlbGVtZW50IGlzIGNsaWNrZWQgc3RhcnQgdGhlIGRyYWcgYmVoYXZpb3VyXHJcbiAgICAgICAgICogT24gdG91Y2ggZGV2aWNlcyBhcyBhIHNtYWxsIGRlbGF5IHNvIGFzIG5vdCB0byBwcmV2ZW50IG5hdGl2ZSB3aW5kb3cgc2Nyb2xsaW5nXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBvbnByZXNzKGV2dCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2RyYWdFbmFibGVkKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0NsaWNrYWJsZUVsZW1lbnQoZXZ0KSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZXZ0LnR5cGUgPT0gXCJtb3VzZWRvd25cIiAmJiBldnQuYnV0dG9uICE9IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIERvIG5vdCBzdGFydCBkcmFnZ2luZyBvbiByaWdodC1jbGlja1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNhdmVFbGVtZW50U3R5bGVzKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5faGFzVG91Y2gpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3ByZXNzVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbmxvbmdwcmVzcyhldnQpO1xyXG4gICAgICAgICAgICAgICAgfSwgdGhpcy5MT05HX1BSRVNTKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGRvY3VtZW50Lm9uKHRoaXMuX21vdmVFdmVudHMsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGRvY3VtZW50Lm9uKHRoaXMuX3JlbGVhc2VFdmVudHMsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25sb25ncHJlc3MoZXZ0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzYXZlRWxlbWVudFN0eWxlcygpIHtcclxuICAgICAgICAgICAgdGhpcy5fZWxlbWVudFN0eWxlLmxlZnQgPSB0aGlzLiRlbGVtZW50LmNzcygnY3NzJykgfHwgMDtcclxuICAgICAgICAgICAgdGhpcy5fZWxlbWVudFN0eWxlLnRvcCA9IHRoaXMuJGVsZW1lbnQuY3NzKCd0b3AnKSB8fCAwO1xyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50U3R5bGUucG9zaXRpb24gPSB0aGlzLiRlbGVtZW50LmNzcygncG9zaXRpb24nKTtcclxuICAgICAgICAgICAgdGhpcy5fZWxlbWVudFN0eWxlLndpZHRoID0gdGhpcy4kZWxlbWVudC5jc3MoJ3dpZHRoJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNhbmNlbFByZXNzKCkge1xyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5fcHJlc3NUaW1lcik7XHJcbiAgICAgICAgICAgIHRoaXMuJGRvY3VtZW50Lm9mZih0aGlzLl9tb3ZlRXZlbnRzLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLiRkb2N1bWVudC5vZmYodGhpcy5fcmVsZWFzZUV2ZW50cywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxQcmVzcygpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25sb25ncHJlc3MoZXZ0KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJhZ0VuYWJsZWQpIHJldHVybjtcclxuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm9mZnNldCA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmFsbG93VHJhbnNmb3JtKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fZHJhZ09mZnNldCA9IHRoaXMub2Zmc2V0O1xyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2RyYWdPZmZzZXQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgIHRvcDogZG9jdW1lbnQuYm9keS5zY3JvbGxUb3BcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAoIDwgYW55ID4gdGhpcy4kZWxlbWVudCkuY2VudGVyWCA9IHRoaXMuJGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGggLyAyO1xyXG4gICAgICAgICAgICAoIDwgYW55ID4gdGhpcy4kZWxlbWVudCkuY2VudGVyWSA9IHRoaXMuJGVsZW1lbnRbMF0ub2Zmc2V0SGVpZ2h0IC8gMjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX214ID0gdGhpcy5waXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VYO1xyXG4gICAgICAgICAgICB0aGlzLl9teSA9IHRoaXMucGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWTtcclxuICAgICAgICAgICAgdGhpcy5fbXJ4ID0gdGhpcy5fbXggLSB0aGlzLm9mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICB0aGlzLl9tcnkgPSB0aGlzLl9teSAtIHRoaXMub2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX2NlbnRlckFuY2hvcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdHggPSB0aGlzLl9teCAtICggPCBhbnkgPiB0aGlzLiRlbGVtZW50KS5jZW50ZXJYIC0gdGhpcy4kd2luZG93LnBhZ2VYT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdHkgPSB0aGlzLl9teSAtICggPCBhbnkgPiB0aGlzLiRlbGVtZW50KS5jZW50ZXJZIC0gdGhpcy4kd2luZG93LnBhZ2VZT2Zmc2V0O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdHggPSB0aGlzLl9teCAtIHRoaXMuX21yeCAtIHRoaXMuJHdpbmRvdy5wYWdlWE9mZnNldDtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3R5ID0gdGhpcy5fbXkgLSB0aGlzLl9tcnkgLSB0aGlzLiR3aW5kb3cucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuJGRvY3VtZW50Lm9uKHRoaXMuX21vdmVFdmVudHMsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbm1vdmUoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub24odGhpcy5fcmVsZWFzZUV2ZW50cywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9ucmVsZWFzZShldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBUaGlzIGV2ZW50IGlzIHVzZWQgdG8gcmVjZWl2ZSBtYW51YWxseSB0cmlnZ2VyZWQgbW91c2UgbW92ZSBldmVudHNcclxuICAgICAgICAgICAgLy8ganFMaXRlIHVuZm9ydHVuYXRlbHkgb25seSBzdXBwb3J0cyB0cmlnZ2VySGFuZGxlciguLi4pXHJcbiAgICAgICAgICAgIC8vIFNlZSBodHRwOi8vYXBpLmpxdWVyeS5jb20vdHJpZ2dlckhhbmRsZXIvXHJcbiAgICAgICAgICAgIC8vIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lciA9ICRyb290U2NvcGUuJG9uKCdkcmFnZ2FibGU6X3RyaWdnZXJIYW5kbGVyTW92ZScsIG9ubW92ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyID0gdGhpcy4kcm9vdFNjb3BlLiRvbignZHJhZ2dhYmxlOl90cmlnZ2VySGFuZGxlck1vdmUnLCAoZXZlbnQsIG9yaWdFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbm1vdmUob3JpZ0V2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9ubW92ZShldnQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9kcmFnRW5hYmxlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdwaXAtZHJhZ2dpbmcnKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZGF0YSA9IHRoaXMuZ2V0RHJhZ0RhdGEodGhpcy4kc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOnN0YXJ0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHg6IHRoaXMuX214LFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IHRoaXMuX215LFxyXG4gICAgICAgICAgICAgICAgICAgIHR4OiB0aGlzLl90eCxcclxuICAgICAgICAgICAgICAgICAgICB0eTogdGhpcy5fdHksXHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGV2dCxcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiB0aGlzLiRlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHRoaXMuX2RhdGFcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uRHJhZ1N0YXJ0Q2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS4kYXBwbHkoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ1N0YXJ0Q2FsbGJhY2sodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRkYXRhOiB0aGlzLl9kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBldnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuX214ID0gdGhpcy5waXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VYO1xyXG4gICAgICAgICAgICB0aGlzLl9teSA9IHRoaXMucGlwRHJhZ2dhYmxlLmlucHV0RXZlbnQoZXZ0KS5wYWdlWTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmhvcml6b250YWxTY3JvbGwgfHwgdGhpcy52ZXJ0aWNhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kcmFnVG9TY3JvbGwoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuX2NlbnRlckFuY2hvcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdHggPSB0aGlzLl9teCAtICggPCBhbnkgPiB0aGlzLiRlbGVtZW50KS5jZW50ZXJYIC0gdGhpcy5fZHJhZ09mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdHkgPSB0aGlzLl9teSAtICggPCBhbnkgPiB0aGlzLiRlbGVtZW50KS5jZW50ZXJZIC0gdGhpcy5fZHJhZ09mZnNldC50b3A7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eCA9IHRoaXMuX214IC0gdGhpcy5fbXJ4IC0gdGhpcy5fZHJhZ09mZnNldC5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdHkgPSB0aGlzLl9teSAtIHRoaXMuX21yeSAtIHRoaXMuX2RyYWdPZmZzZXQudG9wO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vdmVFbGVtZW50KHRoaXMuX3R4LCB0aGlzLl90eSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOm1vdmUnLCB7XHJcbiAgICAgICAgICAgICAgICB4OiB0aGlzLl9teCxcclxuICAgICAgICAgICAgICAgIHk6IHRoaXMuX215LFxyXG4gICAgICAgICAgICAgICAgdHg6IHRoaXMuX3R4LFxyXG4gICAgICAgICAgICAgICAgdHk6IHRoaXMuX3R5LFxyXG4gICAgICAgICAgICAgICAgZXZlbnQ6IGV2dCxcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQ6IHRoaXMuJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB0aGlzLl9kYXRhLFxyXG4gICAgICAgICAgICAgICAgdWlkOiB0aGlzLl9teWlkLFxyXG4gICAgICAgICAgICAgICAgZHJhZ09mZnNldDogdGhpcy5fZHJhZ09mZnNldFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25yZWxlYXNlKGV2dCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2RyYWdFbmFibGVkKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2RyYWdnYWJsZTplbmQnLCB7XHJcbiAgICAgICAgICAgICAgICB4OiB0aGlzLl9teCxcclxuICAgICAgICAgICAgICAgIHk6IHRoaXMuX215LFxyXG4gICAgICAgICAgICAgICAgdHg6IHRoaXMuX3R4LFxyXG4gICAgICAgICAgICAgICAgdHk6IHRoaXMuX3R5LFxyXG4gICAgICAgICAgICAgICAgZXZlbnQ6IGV2dCxcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQ6IHRoaXMuJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB0aGlzLl9kYXRhLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IHRoaXMub25EcmFnQ29tcGxldGUsXHJcbiAgICAgICAgICAgICAgICB1aWQ6IHRoaXMuX215aWRcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnZ2luZycpO1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnBhcmVudCgpLmZpbmQoJy5waXAtZHJhZy1lbnRlcicpLnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICB0aGlzLnJlc2V0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuJGRvY3VtZW50Lm9mZih0aGlzLl9tb3ZlRXZlbnRzKTtcclxuICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub2ZmKHRoaXMuX3JlbGVhc2VFdmVudHMpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vbkRyYWdTdG9wQ2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRhcHBseSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdTdG9wQ2FsbGJhY2sodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IHRoaXMuX2RhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDogZXZ0XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5fZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25EcmFnQ29tcGxldGUoZXZ0KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5vbkRyYWdTdWNjZXNzQ2FsbGJhY2spIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRhcHBseSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ1N1Y2Nlc3NDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICRkYXRhOiB0aGlzLl9kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICRldmVudDogZXZ0XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHJlc2V0KCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5hbGxvd1RyYW5zZm9ybSlcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICd6LWluZGV4JzogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgJy13ZWJraXQtdHJhbnNmb3JtJzogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgJy1tcy10cmFuc2Zvcm0nOiAnJ1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLl9lbGVtZW50U3R5bGUucG9zaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiB0aGlzLl9lbGVtZW50U3R5bGUudG9wLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IHRoaXMuX2VsZW1lbnRTdHlsZS5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgICd6LWluZGV4JzogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHRoaXMuX2VsZW1lbnRTdHlsZS53aWR0aFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgbW92ZUVsZW1lbnQoeCwgeSkge1xyXG4gICAgICAgICAgICBjb25zdCBlV2lkdGggPSB0aGlzLiRlbGVtZW50LmNzcygnd2lkdGgnKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYWxsb3dUcmFuc2Zvcm0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06ICdtYXRyaXgzZCgxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAnICsgeCArICcsICcgKyB5ICsgJywgMCwgMSknLFxyXG4gICAgICAgICAgICAgICAgICAgICd6LWluZGV4JzogOTk5OTksXHJcbiAgICAgICAgICAgICAgICAgICAgJy13ZWJraXQtdHJhbnNmb3JtJzogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAgICAgICAgICAgICAgICAgJy1tcy10cmFuc2Zvcm0nOiAnbWF0cml4KDEsIDAsIDAsIDEsICcgKyB4ICsgJywgJyArIHkgKyAnKSdcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgICdsZWZ0JzogeCArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3RvcCc6IHkgKyAncHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICdwb3NpdGlvbic6ICdmaXhlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiAxMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGVXaWR0aFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgZHJhZ1RvU2Nyb2xsKCkge1xyXG4gICAgICAgICAgICBsZXQgc2Nyb2xsWCA9IDAsXHJcbiAgICAgICAgICAgICAgICBzY3JvbGxZID0gMCxcclxuICAgICAgICAgICAgICAgIG9mZnNldCA9IChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0KCkgfHwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3A6IDBcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmhvcml6b250YWxTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyTGVmdCA9IG9mZnNldCh0aGlzLnNjcm9sbENvbnRhaW5lcikubGVmdCxcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJXaWR0aCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyLmlubmVyV2lkdGgoKSxcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJSaWdodCA9IGNvbnRhaW5lckxlZnQgKyBjb250YWluZXJXaWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoKHRoaXMuX214IC0gY29udGFpbmVyTGVmdCkgPCB0aGlzLmFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcm9sbFggPSAtdGhpcy5zY3JvbGxEaXN0YW5jZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoKGNvbnRhaW5lclJpZ2h0IC0gdGhpcy5fbXgpIDwgdGhpcy5hY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY3JvbGxYID0gdGhpcy5zY3JvbGxEaXN0YW5jZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMudmVydGljYWxTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyVG9wID0gb2Zmc2V0KHRoaXMuc2Nyb2xsQ29udGFpbmVyKS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVySGVpZ2h0ID0gdGhpcy5zY3JvbGxDb250YWluZXIuaW5uZXJIZWlnaHQoKSxcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSBjb250YWluZXJUb3AgKyBjb250YWluZXJIZWlnaHQ7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCh0aGlzLl9teSAtIGNvbnRhaW5lclRvcCkgPCB0aGlzLmFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcm9sbFkgPSAtdGhpcy5zY3JvbGxEaXN0YW5jZSArIDMwO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgoY29udGFpbmVyQm90dG9tIC0gdGhpcy5fbXkpIDwgdGhpcy5hY3RpdmF0aW9uRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY3JvbGxZID0gdGhpcy5zY3JvbGxEaXN0YW5jZSAtIDMwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzY3JvbGxYICE9PSAwIHx8IHNjcm9sbFkgIT09IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyU2Nyb2xsTGVmdCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyLnNjcm9sbExlZnQoKSxcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJTY3JvbGxUb3AgPSB0aGlzLnNjcm9sbENvbnRhaW5lci5zY3JvbGxUb3AoKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lci5zY3JvbGxMZWZ0KGNvbnRhaW5lclNjcm9sbExlZnQgKyBzY3JvbGxYKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcChjb250YWluZXJTY3JvbGxUb3AgKyBzY3JvbGxZKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IERyYWcgPSBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UsXHJcbiAgICAgICAgJHBhcnNlOiBuZy5JUGFyc2VTZXJ2aWNlLFxyXG4gICAgICAgICRkb2N1bWVudDogbmcuSURvY3VtZW50U2VydmljZSxcclxuICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICBwaXBEcmFnZ2FibGU6IElEcmFnZ2FibGVTZXJ2aWNlLFxyXG4gICAgKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiBJRHJhZ0xpbmtTY29wZSxcclxuICAgICAgICAgICAgICAgICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgICAgICAkYXR0cnM6IElEcmFnTGlua0F0dHJpYnV0ZXNcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgRHJhZ0xpbmsoJHJvb3RTY29wZSwgJHBhcnNlLCAkZG9jdW1lbnQsICR3aW5kb3csIHBpcERyYWdnYWJsZSwgJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcInBpcERyYWdnYWJsZVwiKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcERyYWcnLCBEcmFnKTtcclxufSIsImV4cG9ydCBpbnRlcmZhY2UgSURyYWdnYWJsZVNlcnZpY2Uge1xyXG4gICAgaW5wdXRFdmVudChldmVudDogYW55KTtcclxufVxyXG5cclxuY2xhc3MgRHJhZ2dhYmxlU2VydmljZSBpbXBsZW1lbnRzIElEcmFnZ2FibGVTZXJ2aWNlIHtcclxuICAgIHB1YmxpYyBpbnB1dEV2ZW50KGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50LnRvdWNoZXMpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBldmVudC50b3VjaGVzWzBdO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvL0NoZWNraW5nIGJvdGggaXMgbm90IHJlZHVuZGVudC4gSWYgb25seSBjaGVjayBpZiB0b3VjaGVzIGlzRGVmaW5lZCwgYW5ndWxhcmpzIGlzRGVmbmllZCB3aWxsIHJldHVybiBlcnJvciBhbmQgc3RvcCB0aGUgcmVtYWluaW5nIHNjcmlwdHkgaWYgZXZlbnQub3JpZ2luYWxFdmVudCBpcyBub3QgZGVmaW5lZC5cclxuICAgICAgICBlbHNlIGlmIChhbmd1bGFyLmlzRGVmaW5lZChldmVudC5vcmlnaW5hbEV2ZW50KSAmJiBhbmd1bGFyLmlzRGVmaW5lZChldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBldmVudDtcclxuICAgIH07XHJcbn1cclxuXHJcbmFuZ3VsYXJcclxuICAgIC5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIilcclxuICAgIC5zZXJ2aWNlKCdwaXBEcmFnZ2FibGUnLCBEcmFnZ2FibGVTZXJ2aWNlKTtcclxuICAgICIsImltcG9ydCB7IElEcmFnZ2FibGVTZXJ2aWNlIH0gZnJvbSAnLi9EcmFnZ2FibGVTZXJ2aWNlJztcclxuXHJcbntcclxuICAgIGludGVyZmFjZSBJRHJvcExpbmtTY29wZSBleHRlbmRzIG5nLklTY29wZSB7XHJcbiAgICAgICAgdmFsdWU6IGFueTtcclxuICAgICAgICBpc1RvdWNoaW5nOiBhbnk7XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIElEcm9wTGlua0F0dHJpYnV0ZXMgZXh0ZW5kcyBuZy5JQXR0cmlidXRlcyB7XHJcbiAgICAgICAgcGlwRHJvcDogYW55O1xyXG4gICAgICAgIHBpcERyb3BTdWNjZXNzOiBhbnk7XHJcbiAgICAgICAgcGlwRHJhZ1N0YXJ0OiBhbnk7XHJcbiAgICAgICAgcGlwRHJhZ1N0b3A6IGFueTtcclxuICAgICAgICBwaXBEcmFnTW92ZTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIERyb3BMaW5rIHtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfbGFzdERyb3BUb3VjaDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgX215aWQ6IG51bWJlciB8IHN0cmluZztcclxuICAgICAgICBwcml2YXRlIF9kcm9wRW5hYmxlZDogYm9vbGVhbjtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyb3BDYWxsYmFjazogRnVuY3Rpb247IC8vIHx8IGZ1bmN0aW9uKCl7fTtcclxuICAgICAgICBwcml2YXRlIG9uRHJhZ1N0YXJ0Q2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHByaXZhdGUgb25EcmFnU3RvcENhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgICAgICBwcml2YXRlIG9uRHJhZ01vdmVDYWxsYmFjazogRnVuY3Rpb247XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZG9jdW1lbnQ6IG5nLklEb2N1bWVudFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSBwaXBEcmFnZ2FibGU6IElEcmFnZ2FibGVTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRzY29wZTogSURyb3BMaW5rU2NvcGUsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkYXR0cnM6IElEcm9wTGlua0F0dHJpYnV0ZXNcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgJHNjb3BlLnZhbHVlID0gJGF0dHJzLnBpcERyb3A7XHJcbiAgICAgICAgICAgICRzY29wZS5pc1RvdWNoaW5nID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9teWlkID0gJHNjb3BlLiRpZDtcclxuICAgICAgICAgICAgdGhpcy5vbkRyb3BDYWxsYmFjayA9ICRwYXJzZSgkYXR0cnMucGlwRHJvcFN1Y2Nlc3MpOyAvLyB8fCBmdW5jdGlvbigpe307XHJcbiAgICAgICAgICAgIHRoaXMub25EcmFnU3RhcnRDYWxsYmFjayA9ICRwYXJzZSgkYXR0cnMucGlwRHJhZ1N0YXJ0KTtcclxuICAgICAgICAgICAgdGhpcy5vbkRyYWdTdG9wQ2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdTdG9wKTtcclxuICAgICAgICAgICAgdGhpcy5vbkRyYWdNb3ZlQ2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdNb3ZlKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgdG9nZ2xlTGlzdGVuZXJzKGVuYWJsZSkge1xyXG4gICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgIGlmICghZW5hYmxlKSByZXR1cm47XHJcbiAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiR3YXRjaCh0aGlzLiRhdHRycy5waXBEcm9wLCAobmV3VmFsLCBvbGRWYWwpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCckZGVzdHJveScsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkRlc3Ryb3koZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdkcmFnZ2FibGU6c3RhcnQnLCAoZXZ0LCBvYmopID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25EcmFnU3RhcnQoZXZ0LCBvYmopO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdkcmFnZ2FibGU6bW92ZScsIChldnQsIG9iaikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdNb3ZlKGV2dCwgb2JqKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRvbignZHJhZ2dhYmxlOmVuZCcsIChldnQsIG9iaikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdFbmQoZXZ0LCBvYmopO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25EZXN0cm95KGVuYWJsZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZUxpc3RlbmVycyhmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRW5hYmxlQ2hhbmdlKG5ld1ZhbCwgb2xkVmFsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2Ryb3BFbmFibGVkID0gbmV3VmFsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdTdGFydChldnQsIG9iaikge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2Ryb3BFbmFibGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIHRoaXMuaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLiRhdHRycy5waXBEcmFnU3RhcnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25EcmFnU3RhcnRDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZGF0YTogb2JqLmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDogb2JqXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdNb3ZlKGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJvcEVuYWJsZWQpIHJldHVybjtcclxuICAgICAgICAgICAgdGhpcy5pc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuJGF0dHJzLnBpcERyYWdNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ01vdmVDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZGF0YTogb2JqLmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDogb2JqXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdFbmQoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgLy8gZG9uJ3QgbGlzdGVuIHRvIGRyb3AgZXZlbnRzIGlmIHRoaXMgaXMgdGhlIGVsZW1lbnQgYmVpbmcgZHJhZ2dlZFxyXG4gICAgICAgICAgICAvLyBvbmx5IHVwZGF0ZSB0aGUgc3R5bGVzIGFuZCByZXR1cm5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9kcm9wRW5hYmxlZCB8fCB0aGlzLl9teWlkID09PSBvYmoudWlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZURyYWdTdHlsZXMoZmFsc2UsIG9iai5lbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNUb3VjaGluZyhvYmoueCwgb2JqLnksIG9iai5lbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgLy8gY2FsbCB0aGUgcGlwRHJhZ2dhYmxlIHBpcERyYWdTdWNjZXNzIGVsZW1lbnQgY2FsbGJhY2tcclxuICAgICAgICAgICAgICAgIGlmIChvYmouY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICBvYmouY2FsbGJhY2sob2JqKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kYXR0cnMucGlwRHJvcFN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkRyb3BDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IG9iai5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBvYmosXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdGFyZ2V0OiB0aGlzLiRzY29wZS4kZXZhbCh0aGlzLiRzY29wZS52YWx1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLiRhdHRycy5waXBEcmFnU3RvcCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdTdG9wQ2FsbGJhY2sodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IG9iai5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IG9ialxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRHJhZ1N0eWxlcyhmYWxzZSwgb2JqLmVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpc1RvdWNoaW5nKG1vdXNlWCwgbW91c2VZLCBkcmFnRWxlbWVudCkge1xyXG4gICAgICAgICAgICBjb25zdCB0b3VjaGluZyA9IHRoaXMuaGl0VGVzdChtb3VzZVgsIG1vdXNlWSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLmlzVG91Y2hpbmcgPSB0b3VjaGluZztcclxuICAgICAgICAgICAgaWYgKHRvdWNoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9sYXN0RHJvcFRvdWNoID0gdGhpcy4kZWxlbWVudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZURyYWdTdHlsZXModG91Y2hpbmcsIGRyYWdFbGVtZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIHRvdWNoaW5nO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSB1cGRhdGVEcmFnU3R5bGVzKHRvdWNoaW5nLCBkcmFnRWxlbWVudCkge1xyXG4gICAgICAgICAgICBpZiAodG91Y2hpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1kcmFnLWVudGVyJyk7XHJcbiAgICAgICAgICAgICAgICBkcmFnRWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2xhc3REcm9wVG91Y2ggPT0gdGhpcy4kZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbGFzdERyb3BUb3VjaCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdwaXAtZHJhZy1lbnRlcicpO1xyXG4gICAgICAgICAgICAgICAgZHJhZ0VsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnLW92ZXInKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGl0VGVzdCh4LCB5KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvdW5kcyA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgICAgIHggLT0gdGhpcy4kZG9jdW1lbnRbMF0uYm9keS5zY3JvbGxMZWZ0ICsgdGhpcy4kZG9jdW1lbnRbMF0uZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQ7XHJcbiAgICAgICAgICAgIHkgLT0gdGhpcy4kZG9jdW1lbnRbMF0uYm9keS5zY3JvbGxUb3AgKyB0aGlzLiRkb2N1bWVudFswXS5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgICAgICAgICByZXR1cm4geCA+PSBib3VuZHMubGVmdCAmJlxyXG4gICAgICAgICAgICAgICAgeCA8PSBib3VuZHMucmlnaHQgJiZcclxuICAgICAgICAgICAgICAgIHkgPD0gYm91bmRzLmJvdHRvbSAmJlxyXG4gICAgICAgICAgICAgICAgeSA+PSBib3VuZHMudG9wO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBEcm9wID0gZnVuY3Rpb24gKFxyXG4gICAgICAgICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICAkZG9jdW1lbnQ6IG5nLklEb2N1bWVudFNlcnZpY2UsXHJcbiAgICAgICAgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSxcclxuICAgICAgICBwaXBEcmFnZ2FibGU6IElEcmFnZ2FibGVTZXJ2aWNlLFxyXG4gICAgKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiBJRHJvcExpbmtTY29wZSxcclxuICAgICAgICAgICAgICAgICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgICAgICAkYXR0cnM6IElEcm9wTGlua0F0dHJpYnV0ZXNcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgRHJvcExpbmsoJHBhcnNlLCAkZG9jdW1lbnQsICR0aW1lb3V0LCBwaXBEcmFnZ2FibGUsICRzY29wZSwgJGVsZW1lbnQsICRhdHRycyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIilcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBEcm9wJywgRHJvcCk7XHJcbn0iLCJ7XHJcblxyXG4gICAgY2xhc3MgUHJldmVudERyYWdMaW5rIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0aWFsaXplKCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3BpcC1kcmFnZ2FibGUnLCAnZmFsc2UnKTtcclxuICAgICAgICAgICAgdGhpcy50b2dnbGVMaXN0ZW5lcnModHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHRvZ2dsZUxpc3RlbmVycyhlbmFibGUpIHtcclxuICAgICAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xyXG4gICAgICAgICAgICBpZiAoIWVuYWJsZSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzLlxyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24gdG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgdG91Y2hjYW5jZWwnLCAoZXZlbnQpID0+IHsgdGhpcy5hYnNvcmJFdmVudF8oZXZlbnQpOyB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgYWJzb3JiRXZlbnRfKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGUgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0ICYmIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24gJiYgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBlLnJldHVyblZhbHVlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IFByZXZlbnREcmFnID0gZnVuY3Rpb24gKCk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChcclxuICAgICAgICAgICAgICAgICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgICAgICRhdHRyczogbmcuSUF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgUHJldmVudERyYWdMaW5rKCRlbGVtZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcInBpcERyYWdnYWJsZVwiKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcFByZXZlbnREcmFnJywgUHJldmVudERyYWcpO1xyXG59IiwiYW5ndWxhci5tb2R1bGUoXCJwaXBEcmFnZ2FibGVcIiwgW10pO1xyXG5cclxuaW1wb3J0ICcuL0RyYWdnYWJsZVNlcnZpY2UnO1xyXG5pbXBvcnQgJy4vRHJhZyc7XHJcbmltcG9ydCAnLi9Ecm9wJztcclxuaW1wb3J0ICcuL1ByZXZlbnREcmFnJztcclxuaW1wb3J0ICcuL0NhbmNlbERyYWcnO1xyXG4iLCJ7XHJcbiAgICBpbnRlcmZhY2UgRm9jdXNlZFNjb3BlIGV4dGVuZHMgbmcuSVNjb3BlIHtcclxuICAgICAgICBwaXBGb2N1c2VkQ29sb3I6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcEZvY3VzZWRDbGFzczogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZFJlYmluZDogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZFRhYmluZGV4OiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBGb2N1c2VkT3BhY2l0eTogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZERhdGE6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcFdpdGhIaWRkZW46IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcFJlYmluZDogRnVuY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIEZvY3VzZWRBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIG5nTW9kZWw6IGFueTtcclxuICAgICAgICBwaXBGb2N1c2VkRGF0YTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIEZvY3VzZWRMaW5rIGltcGxlbWVudHMgbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcHJpdmF0ZSBjb250cm9sczogSlF1ZXJ5O1xyXG4gICAgICAgIHByaXZhdGUgY29udHJvbHNMZW5ndGg6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIGNvbG9yOiBzdHJpbmc7XHJcbiAgICAgICAgcHJpdmF0ZSBvcGFjaXR5RGVsdGE6IG51bWJlciA9IDAuNDtcclxuICAgICAgICBwcml2YXRlIG9wYWNpdHlMaW1pdDogbnVtYmVyID0gMC41O1xyXG4gICAgICAgIHByaXZhdGUgb2xkQmFja2dyb3VuZENvbG9yOiBzdHJpbmc7XHJcbiAgICAgICAgcHJpdmF0ZSBvbkZvY3VzQ2xhc3M6IHN0cmluZztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHNjb3BlOiBGb2N1c2VkU2NvcGUsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgJGF0dHJzOiBGb2N1c2VkQXR0cmlidXRlcyxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRtZENvbnN0YW50OiBhbnksXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2VcclxuICAgICAgICApIHtcclxuXHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCdrZXlkb3duJywgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMua2V5ZG93bkxpc3RlbmVyKGUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGlmICgkYXR0cnMubmdNb2RlbCkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgnbmdNb2RlbCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dCh0aGlzLmluaXQpO1xyXG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICgkYXR0cnMucGlwRm9jdXNlZERhdGEpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcEZvY3VzZWREYXRhJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KHRoaXMuaW5pdCk7XHJcbiAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0KCkge1xyXG4gICAgICAgICAgICBjb25zdCBzZWxlY3RvciA9IHRoaXMuJHNjb3BlLnBpcFdpdGhIaWRkZW4gJiYgdGhpcy4kc2NvcGUucGlwV2l0aEhpZGRlbigpID8gJy5waXAtZm9jdXNhYmxlJyA6ICcucGlwLWZvY3VzYWJsZTp2aXNpYmxlJztcclxuICAgICAgICAgICAgdGhpcy5vbkZvY3VzQ2xhc3MgPSB0aGlzLiRzY29wZS5waXBGb2N1c2VkQ2xhc3MgPyB0aGlzLiRzY29wZS5waXBGb2N1c2VkQ2xhc3MoKSA6ICcnO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xzID0gdGhpcy4kZWxlbWVudC5maW5kKHNlbGVjdG9yKTtcclxuICAgICAgICAgICAgdGhpcy5jb250cm9sc0xlbmd0aCA9IHRoaXMuY29udHJvbHMubGVuZ3RoO1xyXG4gICAgICAgICAgICB0aGlzLmNoZWNrVGFiaW5kZXgodGhpcy5jb250cm9scyk7XHJcbiAgICAgICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lcnNcclxuICAgICAgICAgICAgdGhpcy5jb250cm9scy5vbignZm9jdXMnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoJCh0YXJnZXQpLmhhc0NsYXNzKCdtZC1mb2N1c2VkJykpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kc2NvcGUucGlwUmViaW5kICYmIHRoaXMuJHNjb3BlLnBpcFJlYmluZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdwaXAtZm9jdXNlZC1jb250YWluZXInKTtcclxuICAgICAgICAgICAgICAgICQodGFyZ2V0KS5hZGRDbGFzcyh0aGlzLm9uRm9jdXNDbGFzcyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuJHNjb3BlLnBpcEZvY3VzZWRPcGFjaXR5IHx8ICF0aGlzLiRzY29wZS5waXBGb2N1c2VkT3BhY2l0eSgpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sb3IgPSAkKHRhcmdldCkuY3NzKCdiYWNrZ3JvdW5kQ29sb3InKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9sZEJhY2tncm91bmRDb2xvciA9IHRoaXMuY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLmNzcygnYmFja2dyb3VuZENvbG9yJywgdGhpcy5yZ2JhKHRoaXMuY29sb3IpKTtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkuYWRkQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLmFkZENsYXNzKCdtZC1mb2N1c2VkIG1kLWZvY3VzZWQtb3BhY2l0eScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSkub24oJ2ZvY3Vzb3V0JywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBldmVudC5jdXJyZW50VGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgaWYgKCEkKHRhcmdldCkuaGFzQ2xhc3MoJ21kLWZvY3VzZWQnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1mb2N1c2VkLWNvbnRhaW5lcicpO1xyXG4gICAgICAgICAgICAgICAgJCh0YXJnZXQpLnJlbW92ZUNsYXNzKHRoaXMub25Gb2N1c0NsYXNzKTtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy4kc2NvcGUucGlwRm9jdXNlZE9wYWNpdHkgfHwgIXRoaXMuJHNjb3BlLnBpcEZvY3VzZWRPcGFjaXR5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCB0aGlzLm9sZEJhY2tncm91bmRDb2xvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0YXJnZXQpLnJlbW92ZUNsYXNzKCdtZC1mb2N1c2VkIG1kLWZvY3VzZWQtb3BhY2l0eScpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHJnYmEoY29sb3IpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRDb2xvciAmJiB0aGlzLiRzY29wZS5waXBGb2N1c2VkQ29sb3IoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRDb2xvcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhcnIgPSBjb2xvci5zcGxpdChcIihcIilbMV0uc3BsaXQoXCIpXCIpWzBdLnNwbGl0KFwiLFwiKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghYXJyIHx8IGFyci5sZW5ndGggPCAzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJydcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHJlZCwgYmx1ZSwgZ3JlZW4sIG9wYWNpdHk7XHJcblxyXG4gICAgICAgICAgICBvcGFjaXR5ID0gYXJyLmxlbmd0aCA9PSAzID8gMSA6IHBhcnNlRmxvYXQoYXJyWzNdKTtcclxuICAgICAgICAgICAgcmVkID0gYXJyWzBdO1xyXG4gICAgICAgICAgICBibHVlID0gYXJyWzFdO1xyXG4gICAgICAgICAgICBncmVlbiA9IGFyclsyXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChvcGFjaXR5IDwgdGhpcy5vcGFjaXR5TGltaXQpIHtcclxuICAgICAgICAgICAgICAgIG9wYWNpdHkgKz0gdGhpcy5vcGFjaXR5RGVsdGE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBvcGFjaXR5IC09IHRoaXMub3BhY2l0eURlbHRhO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJ3JnYmEoJyArIHJlZCArICcsICcgKyBibHVlICsgJywgJyArIGdyZWVuICsgJywgJyArIG9wYWNpdHkgKyAnKSc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHNldFRhYmluZGV4KGVsZW1lbnQsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCB2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNoZWNrVGFiaW5kZXgoY29udHJvbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBfLmZpbmRJbmRleChjb250cm9scywgKGMpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjWyd0YWJpbmRleCddID4gLTE7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGluZGV4ID09IC0xICYmIGNvbnRyb2xzLmxlbmd0aCA+IDAgJiYgdGhpcy4kc2NvcGUucGlwRm9jdXNlZFRhYmluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFRhYmluZGV4KGFuZ3VsYXIuZWxlbWVudChjb250cm9sc1swXSksIHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRUYWJpbmRleCgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBrZXlkb3duTGlzdGVuZXIoZSkge1xyXG4gICAgICAgICAgICBjb25zdCBrZXlDb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIGNvbnRyb2wga2V5Q29kZVxyXG4gICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkxFRlRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5VUF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPV1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdFxyXG4gICAgICAgICAgICAgICAgICAgIGluY3JlbWVudCA9IChrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHwga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1cpID8gMSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vdmVUb0NvbnRyb2wgPSB0aGlzLmNvbnRyb2xzLmluZGV4KHRoaXMuY29udHJvbHMuZmlsdGVyKFwiLm1kLWZvY3VzZWRcIikpICsgaW5jcmVtZW50O1xyXG4gICAgICAgICAgICAgICAgLy8gTW92ZSBmb2N1cyB0byBuZXh0IGNvbnRyb2xcclxuICAgICAgICAgICAgICAgIGlmIChtb3ZlVG9Db250cm9sID49IDAgJiYgbW92ZVRvQ29udHJvbCA8IHRoaXMuY29udHJvbHNMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRyb2xzW21vdmVUb0NvbnRyb2xdLmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgRm9jdXNlZCA9IGZ1bmN0aW9uICgkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLCBcclxuICAgICAgICAkbWRDb25zdGFudDogYW55LCBcclxuICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZVxyXG4gICAgKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRDb2xvcjogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRDbGFzczogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRSZWJpbmQ6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBGb2N1c2VkVGFiaW5kZXg6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBGb2N1c2VkT3BhY2l0eTogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWREYXRhOiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwV2l0aEhpZGRlbjogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcFJlYmluZDogJyY/J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbigkc2NvcGU6IEZvY3VzZWRTY29wZSwgJGVsZW1lbnQ6IEpRdWVyeSwgJGF0dHJzOiBGb2N1c2VkQXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICAgICAgbmV3IEZvY3VzZWRMaW5rKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgJHRpbWVvdXQsICRtZENvbnN0YW50LCAkd2luZG93KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcInBpcEZvY3VzZWRcIiwgW10pXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwRm9jdXNlZCcsIEZvY3VzZWQpO1xyXG59Iiwi77u/aW1wb3J0ICcuL3Vuc2F2ZWRfY2hhbmdlcy91bnNhdmVkQ2hhbmdlcyc7XHJcbmltcG9ydCAnLi9zaG9ydGN1dHMvaW5kZXgnO1xyXG5pbXBvcnQgJy4vZm9jdXNlZC9mb2N1c2VkJztcclxuaW1wb3J0ICcuL2RyYWdnYWJsZS9pbmRleCc7XHJcbmltcG9ydCAnLi9zZWxlY3RlZC9zZWxlY3RlZCc7XHJcbmltcG9ydCAnLi9pbmZpbml0ZV9zY3JvbGwvaW5maW5pdGVTY3JvbGwnO1xyXG5cclxuYW5ndWxhci5tb2R1bGUoJ3BpcEJlaGF2aW9ycycsIFtcclxuICAgICdwaXBGb2N1c2VkJyxcclxuICAgICdwaXBTZWxlY3RlZCcsXHJcbiAgICAncGlwSW5maW5pdGVTY3JvbGwnLFxyXG4gICAgJ3BpcFVuc2F2ZWRDaGFuZ2VzJyxcclxuICAgICdwaXBEcmFnZ2FibGUnLFxyXG4gICAgJ3BpcFNob3J0Y3V0cydcclxuXSk7XHJcblxyXG5leHBvcnQgKiBmcm9tICcuL3Nob3J0Y3V0cy9pbmRleCc7XHJcbiIsIntcclxuICAgIGludGVyZmFjZSBJbmZpbml0ZVNjcm9sbFNjb3BlIGV4dGVuZHMgbmcuSVNjb3BlIHtcclxuICAgICAgICBwaXBJbmZpbml0ZVNjcm9sbDogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwU2Nyb2xsQ29udGFpbmVyOiBKUXVlcnk7XHJcbiAgICAgICAgcGlwU2Nyb2xsRGlzdGFuY2U6IG51bWJlciB8IHN0cmluZztcclxuICAgICAgICBwaXBTY3JvbGxEaXNhYmxlZDogYm9vbGVhbjtcclxuICAgICAgICBwaXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbTogYm9vbGVhbjtcclxuICAgICAgICBwaXBTY3JvbGxMaXN0ZW5Gb3JFdmVudDogc3RyaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGludGVyZmFjZSBJbmZpbml0ZVNjcm9sbEF0dHJpYnV0ZXMgZXh0ZW5kcyBuZy5JQXR0cmlidXRlcyB7XHJcbiAgICAgICAgcGlwU2Nyb2xsUGFyZW50OiBhbnk7XHJcbiAgICAgICAgcGlwU2Nyb2xJbW1lZGlhdGVDaGVjazogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIEluZmluaXRlU2Nyb2xsTGluayB7XHJcbiAgICAgICAgcHJpdmF0ZSBUSFJPVFRMRV9NSUxMSVNFQ09ORFM6IG51bWJlciA9IDUwMDtcclxuICAgICAgICBwcml2YXRlIGNoZWNrV2hlbkVuYWJsZWQgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgc2Nyb2xsQ29udGFpbmVyID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIGltbWVkaWF0ZUNoZWNrID0gdHJ1ZTtcclxuICAgICAgICBwcml2YXRlIHNjcm9sbERpc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlIHNjcm9sbEVuYWJsZWQgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgdW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgdXNlRG9jdW1lbnRCb3R0b20gPSBmYWxzZTtcclxuICAgICAgICBwcml2YXRlIHdpbmRvd0VsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgb25Db250YWluZXJTY3JvbGxUaHJvdHRsZTogRnVuY3Rpb247XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRpbnRlcnZhbDogbmcuSUludGVydmFsU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IEluZmluaXRlU2Nyb2xsU2NvcGUsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkYXR0cnM6IEluZmluaXRlU2Nyb2xsQXR0cmlidXRlc1xyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICB0aGlzLndpbmRvd0VsZW1lbnQgPSBhbmd1bGFyLmVsZW1lbnQoJHdpbmRvdyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUgPSBfLnRocm90dGxlKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGwoKTtcclxuICAgICAgICAgICAgfSwgdGhpcy5USFJPVFRMRV9NSUxMSVNFQ09ORFMpO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lci51bmJpbmQoJ3Njcm9sbCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVucmVnaXN0ZXJFdmVudExpc3RlbmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbERpc3RhbmNlJywgKHYpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsRGlzdGFuY2Uodik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbERpc3RhbmNlKCRzY29wZS5waXBTY3JvbGxEaXN0YW5jZSk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBTY3JvbGxEaXNhYmxlZCcsICh2KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbERpc2FibGVkKHYpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxEaXNhYmxlZCgkc2NvcGUucGlwU2Nyb2xsRGlzYWJsZWQpO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20nLCAodikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSh2KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20oJHNjb3BlLnBpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlQ29udGFpbmVyKHRoaXMud2luZG93RWxlbWVudCk7XHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUucGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudW5yZWdpc3RlckV2ZW50TGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbigkc2NvcGUucGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBTY3JvbGxDb250YWluZXInLCAobmV3Q29udGFpbmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyICE9IHRoaXMuc2Nyb2xsQ29udGFpbmVyKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsQ29udGFpbmVyKG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbENvbnRhaW5lcigkc2NvcGUucGlwU2Nyb2xsQ29udGFpbmVyIHx8IFtdKTtcclxuXHJcbiAgICAgICAgICAgIGlmICgkYXR0cnMucGlwU2Nyb2xsUGFyZW50ICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZUNvbnRhaW5lcihhbmd1bGFyLmVsZW1lbnQoJGVsZW1lbnQucGFyZW50KCkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoJGF0dHJzLnBpcFNjcm9sSW1tZWRpYXRlQ2hlY2sgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1tZWRpYXRlQ2hlY2sgPSAkc2NvcGUuJGV2YWwoJGF0dHJzLnBpcFNjcm9sSW1tZWRpYXRlQ2hlY2spO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAkaW50ZXJ2YWwoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmltbWVkaWF0ZUNoZWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KSwgMCwgMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhlaWdodChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50WzBdIHx8IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGlmIChpc05hTihlbGVtZW50Lm9mZnNldEhlaWdodCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb2Zmc2V0VG9wKGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgaWYgKCFlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCB8fCBlbGVtZW50LmNzcygnbm9uZScpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICsgdGhpcy5wYWdlWU9mZnNldChlbGVtZW50KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgcGFnZVlPZmZzZXQoZWxlbWVudCkge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXSB8fCBlbGVtZW50O1xyXG4gICAgICAgICAgICBpZiAoaXNOYU4od2luZG93LnBhZ2VZT2Zmc2V0KSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50Lm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Db250YWluZXJTY3JvbGwoKSB7XHJcbiAgICAgICAgICAgIGxldCBjb250YWluZXJCb3R0b20sXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQsXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tLFxyXG4gICAgICAgICAgICAgICAgcmVtYWluaW5nLFxyXG4gICAgICAgICAgICAgICAgc2hvdWxkU2Nyb2xsO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuc2Nyb2xsQ29udGFpbmVyID09PSB0aGlzLndpbmRvd0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IHRoaXMuaGVpZ2h0KHRoaXMuc2Nyb2xsQ29udGFpbmVyKSArIHRoaXMucGFnZVlPZmZzZXQodGhpcy5zY3JvbGxDb250YWluZXJbMF0uZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSB0aGlzLm9mZnNldFRvcCh0aGlzLiRlbGVtZW50KSArIHRoaXMuaGVpZ2h0KHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gdGhpcy5oZWlnaHQodGhpcy5zY3JvbGxDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyVG9wT2Zmc2V0ID0gMDtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9mZnNldFRvcCh0aGlzLnNjcm9sbENvbnRhaW5lcikgIT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCA9IHRoaXMub2Zmc2V0VG9wKHRoaXMuc2Nyb2xsQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20gPSB0aGlzLm9mZnNldFRvcCh0aGlzLiRlbGVtZW50KSAtIGNvbnRhaW5lclRvcE9mZnNldCArIHRoaXMuaGVpZ2h0KHRoaXMuJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy51c2VEb2N1bWVudEJvdHRvbSkge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSA9IHRoaXMuaGVpZ2h0KCh0aGlzLiRlbGVtZW50WzBdLm93bmVyRG9jdW1lbnQgfHwgKCA8IGFueSA+IHRoaXMuJGVsZW1lbnRbMF0pLmRvY3VtZW50KS5kb2N1bWVudEVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZW1haW5pbmcgPSBlbGVtZW50Qm90dG9tIC0gY29udGFpbmVyQm90dG9tO1xyXG4gICAgICAgICAgICBzaG91bGRTY3JvbGwgPSByZW1haW5pbmcgPD0gdGhpcy5oZWlnaHQodGhpcy5zY3JvbGxDb250YWluZXIpICogdGhpcy5zY3JvbGxEaXN0YW5jZSArIDE7XHJcblxyXG4gICAgICAgICAgICBpZiAoc2hvdWxkU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrV2hlbkVuYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2Nyb2xsRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLiRzY29wZS4kJHBoYXNlIHx8IHRoaXMuJHJvb3RTY29wZS4kJHBoYXNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRzY29wZS5waXBJbmZpbml0ZVNjcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRzY29wZS4kYXBwbHkoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUucGlwSW5maW5pdGVTY3JvbGwoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2hlY2tXaGVuRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNjcm9sbERpc3RhbmNlKHYpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Nyb2xsRGlzdGFuY2UgPSBwYXJzZUZsb2F0KHYpIHx8IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNjcm9sbERpc2FibGVkKHYpIHtcclxuICAgICAgICAgICAgdGhpcy5zY3JvbGxFbmFibGVkID0gIXY7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbEVuYWJsZWQgJiYgdGhpcy5jaGVja1doZW5FbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrV2hlbkVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKHYpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudXNlRG9jdW1lbnRCb3R0b20gPSB2O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjaGFuZ2VDb250YWluZXIobmV3Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbENvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIudW5iaW5kKCdzY3JvbGwnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIgPSBuZXdDb250YWluZXI7XHJcbiAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNjcm9sbENvbnRhaW5lci5iaW5kKCdzY3JvbGwnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTY3JvbGxDb250YWluZXIobmV3Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIGlmICgobmV3Q29udGFpbmVyID09IG51bGwpIHx8IG5ld0NvbnRhaW5lci5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChuZXdDb250YWluZXIpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBuZXdDb250YWluZXIuYXBwZW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQobmV3Q29udGFpbmVyW25ld0NvbnRhaW5lci5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld0NvbnRhaW5lciA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IHRoaXMuJGVsZW1lbnQucGFyZW50cygpLmZpbmQobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lciAhPSBudWxsICYmICghQXJyYXkuaXNBcnJheShuZXdDb250YWluZXIpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgKEFycmF5LmlzQXJyYXkobmV3Q29udGFpbmVyKSAmJiBuZXdDb250YWluZXIubGVuZ3RoID4gMCkpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jaGFuZ2VDb250YWluZXIobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcGlwLXNjcm9sbC1jb250YWluZXIgYXR0cmlidXRlLlwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgSW5maW5pdGVTY3JvbGwgPSBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UsXHJcbiAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgJGludGVydmFsOiBuZy5JSW50ZXJ2YWxTZXJ2aWNlXHJcbiAgICApOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgcGlwSW5maW5pdGVTY3JvbGw6ICcmJyxcclxuICAgICAgICAgICAgICAgIHBpcFNjcm9sbENvbnRhaW5lcjogJz0nLFxyXG4gICAgICAgICAgICAgICAgcGlwU2Nyb2xsRGlzdGFuY2U6ICc9JyxcclxuICAgICAgICAgICAgICAgIHBpcFNjcm9sbERpc2FibGVkOiAnPScsXHJcbiAgICAgICAgICAgICAgICBwaXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbTogJz0nLFxyXG4gICAgICAgICAgICAgICAgcGlwU2Nyb2xsTGlzdGVuRm9yRXZlbnQ6ICdAJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoXHJcbiAgICAgICAgICAgICAgICAkc2NvcGU6IEluZmluaXRlU2Nyb2xsU2NvcGUsXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAgICAgJGF0dHJzOiBJbmZpbml0ZVNjcm9sbEF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgSW5maW5pdGVTY3JvbGxMaW5rKCRyb290U2NvcGUsICR3aW5kb3csICRpbnRlcnZhbCwgJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcInBpcEluZmluaXRlU2Nyb2xsXCIsIFtdKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcEluZmluaXRlU2Nyb2xsJywgSW5maW5pdGVTY3JvbGwpO1xyXG59Iiwie1xyXG4gICAgaW50ZXJmYWNlIFNlbGVjdGVkQXR0cmlidXRlcyBleHRlbmRzIG5nLklBdHRyaWJ1dGVzIHtcclxuICAgICAgICBwaXBTZWxlY3RlZDogYW55O1xyXG4gICAgICAgIHBpcFNlbGVjdGVkSWQ6IGFueTtcclxuICAgICAgICBwaXBTZWxlY3Q6IGFueTtcclxuICAgICAgICBwaXBFbnRlclNwYWNlUHJlc3M6IGFueTtcclxuICAgICAgICBwaXBOb1Njcm9sbDogYW55O1xyXG4gICAgICAgIHBpcFNraXBIaWRkZW46IGFueTtcclxuICAgICAgICBwaXBUcmVlTGlzdDogYW55O1xyXG4gICAgICAgIHBpcFNlbGVjdGVkV2F0Y2g6IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBTZWxlY3RlZExpbmsge1xyXG4gICAgICAgIHByaXZhdGUgaW5kZXhHZXR0ZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIGluZGV4U2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBpZFNldHRlcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgaWRHZXR0ZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIGNoYW5nZUdldHRlcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgZW50ZXJTcGFjZUdldHRlcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgbm9TY3JvbGw6IGFueTtcclxuICAgICAgICBwcml2YXRlIG1vZGlmaWVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBjbGFzc05hbWU6IGFueTtcclxuICAgICAgICBwcml2YXRlIHNlbGVjdGVkSW5kZXg6IGFueTtcclxuICAgICAgICBwcml2YXRlIGN1cnJlbnRFbGVtZW50VGFiaW5leDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgcGlwU2VsZWN0ZWRXYXRjaDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgaXNTY3JvbGxlZDogYW55O1xyXG4gICAgICAgIC8vIFZhcmlhYmxlcyBmb3IgdG91Y2ggZnVuY3Rpb25zXHJcbiAgICAgICAgcHJpdmF0ZSB0b3VjaFN0YXJ0WDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgdG91Y2hTdGFydFk6IGFueTtcclxuICAgICAgICBwcml2YXRlIHRyYWNraW5nQ2xpY2s6IGFueTtcclxuICAgICAgICBwcml2YXRlIHRyYWNraW5nQ2xpY2tTdGFydDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgdGFyZ2V0RWxlbWVudDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgbGFzdENsaWNrVGltZTogYW55O1xyXG4gICAgICAgIHByaXZhdGUgY2FuY2VsTmV4dENsaWNrOiBhbnk7XHJcbiAgICAgICAgLy8gQ29uc3RhbnRzIGZvciB0b3VjaCBmdW5jdGlvbnNcclxuICAgICAgICBwcml2YXRlIHRvdWNoQm91bmRhcnk6IG51bWJlciA9IDEwO1xyXG4gICAgICAgIHByaXZhdGUgdGFwZGVsYXk6IG51bWJlciA9IDIwMDtcclxuICAgICAgICBwcml2YXRlIHRhcFRpbWVvdXQ6IG51bWJlciA9IDcwMDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbWRDb25zdGFudDogYW55LFxyXG4gICAgICAgICAgICBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkYXR0cnM6IFNlbGVjdGVkQXR0cmlidXRlc1xyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICB0aGlzLmluZGV4R2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdGVkID8gJHBhcnNlKCRhdHRycy5waXBTZWxlY3RlZCkgOiBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmluZGV4U2V0dGVyID0gdGhpcy5pbmRleEdldHRlciA/IHRoaXMuaW5kZXhHZXR0ZXIuYXNzaWduIDogbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5pZEdldHRlciA9ICRhdHRycy5waXBTZWxlY3RlZElkID8gJHBhcnNlKCRhdHRycy5waXBTZWxlY3RlZElkKSA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuaWRTZXR0ZXIgPSB0aGlzLmlkR2V0dGVyID8gdGhpcy5pZEdldHRlci5hc3NpZ24gOiBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmNoYW5nZUdldHRlciA9ICRhdHRycy5waXBTZWxlY3QgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdCkgOiBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmVudGVyU3BhY2VHZXR0ZXIgPSAkYXR0cnMucGlwRW50ZXJTcGFjZVByZXNzID8gJHBhcnNlKCRhdHRycy5waXBFbnRlclNwYWNlUHJlc3MpIDogbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5ub1Njcm9sbCA9ICRhdHRycy5waXBOb1Njcm9sbDtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllciA9ICRhdHRycy5waXBTa2lwSGlkZGVuID8gJzp2aXNpYmxlJyA6ICcnO1xyXG4gICAgICAgICAgICB0aGlzLmNsYXNzTmFtZSA9ICRhdHRycy5waXBUcmVlTGlzdCA/ICcucGlwLXNlbGVjdGFibGUtdHJlZScgOiAnLnBpcC1zZWxlY3RhYmxlJztcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gdGhpcy5pbmRleEdldHRlcigkc2NvcGUpO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRFbGVtZW50VGFiaW5leCA9ICRlbGVtZW50LmF0dHIoJ3RhYmluZGV4Jyk7XHJcbiAgICAgICAgICAgIHRoaXMucGlwU2VsZWN0ZWRXYXRjaCA9ICRhdHRycy5waXBTZWxlY3RlZFdhdGNoO1xyXG4gICAgICAgICAgICB0aGlzLmlzU2Nyb2xsZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICRlbGVtZW50LmF0dHIoJ3RhYmluZGV4JywgdGhpcy5jdXJyZW50RWxlbWVudFRhYmluZXggfHwgMCk7XHJcblxyXG4gICAgICAgICAgICAkZWxlbWVudC5vbignY2xpY2snLCB0aGlzLmNsYXNzTmFtZSwgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2xpY2tFdmVudChldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkZWxlbWVudC5vbigndG91Y2hzdGFydCcsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Ub3VjaFN0YXJ0KGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCd0b3VjaG1vdmUnLCB0aGlzLmNsYXNzTmFtZSwgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uVG91Y2hNb3ZlKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCd0b3VjaGVuZCcsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Ub3VjaEVuZChldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkZWxlbWVudC5vbigndG91Y2hjYW5jZWwnLCB0aGlzLmNsYXNzTmFtZSwgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uVG91Y2hDYW5jZWwoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25LZXlEb3duKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c2luJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRm9jdXNJbihldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkZWxlbWVudC5vbignZm9jdXNvdXQnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Gb2N1c091dChldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gV2F0Y2ggc2VsZWN0ZWQgaXRlbSBpbmRleFxyXG4gICAgICAgICAgICBpZiAoISRhdHRycy5waXBUcmVlTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCh0aGlzLmluZGV4R2V0dGVyLCAobmV3U2VsZWN0ZWRJbmRleCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogbmV3U2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKHRoaXMuaWRHZXR0ZXIsIChuZXdTZWxlY3RlZElkKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUlkOiBuZXdTZWxlY3RlZElkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFpc2VFdmVudDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAwKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBXYXRjaCByZXN5bmMgc2VsZWN0aW9uXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBpcFNlbGVjdGVkV2F0Y2gpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2godGhpcy5waXBTZWxlY3RlZFdhdGNoLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVsYXkgdXBkYXRlIHRvIGFsbG93IG5nLXJlcGVhdCB0byB1cGRhdGUgRE9NXHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSB0aGlzLmluZGV4R2V0dGVyKCRzY29wZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXg6IHRoaXMuc2VsZWN0ZWRJbmRleFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFNlbGVjdCBpdGVtIGRlZmluZWQgYnkgaW5kZXhcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogdGhpcy5zZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgaXRlbXM6ICRlbGVtZW50LmZpbmQodGhpcy5jbGFzc05hbWUpXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzZWxlY3RJdGVtKGl0ZW1QYXJhbXMpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNTY3JvbGxlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBsZXQgaXRlbUluZGV4ID0gaXRlbVBhcmFtcy5pdGVtSW5kZXgsXHJcbiAgICAgICAgICAgICAgICBpdGVtSWQgPSBpdGVtUGFyYW1zLml0ZW1JZCxcclxuICAgICAgICAgICAgICAgIGl0ZW1zID0gaXRlbVBhcmFtcy5pdGVtcyB8fCB0aGlzLiRlbGVtZW50LmZpbmQodGhpcy5jbGFzc05hbWUgKyB0aGlzLm1vZGlmaWVyKSxcclxuICAgICAgICAgICAgICAgIGl0ZW1zTGVuZ3RoID0gaXRlbXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgaXRlbSA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbVBhcmFtcy5pdGVtKSByZXR1cm4gaXRlbVBhcmFtcy5pdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtSW5kZXggPT09IHVuZGVmaW5lZCAmJiBpdGVtSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleCA9IGl0ZW1zLmluZGV4KGl0ZW1zLmZpbHRlcignW3BpcC1pZD0nICsgaXRlbUlkICsgJ10nKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtSW5kZXggPj0gMCAmJiBpdGVtSW5kZXggPCBpdGVtc0xlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXNbaXRlbUluZGV4XVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQgPSBpdGVtUGFyYW1zLnJhaXNlRXZlbnQ7XHJcbiAgICAgICAgICAgICAgICBpdGVtID0gaXRlbSgpO1xyXG4gICAgICAgICAgICBpZiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQgbWQtZm9jdXNlZCcpO1xyXG4gICAgICAgICAgICAgICAgaXRlbSA9IDxhbnk+YW5ndWxhci5lbGVtZW50KGl0ZW0pXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzZWxlY3RlZCBtZC1mb2N1c2VkJylcclxuICAgICAgICAgICAgICAgICAgICAuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5ub1Njcm9sbCkgdGhpcy5zY3JvbGxUb0l0ZW0oaXRlbSk7XHJcbiAgICAgICAgICAgICAgICBpZiAocmFpc2VFdmVudCkgdGhpcy5kZWZpbmVTZWxlY3RlZEluZGV4KGl0ZW1zKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByaXZhdGUgZGVmaW5lU2VsZWN0ZWRJbmRleChpdGVtcykge1xyXG4gICAgICAgICAgICBjb25zdCBvbGRTZWxlY3RlZEluZGV4ID0gdGhpcy5zZWxlY3RlZEluZGV4O1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSAtMTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGl0ZW1zLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKCQoaXRlbXNbaW5kZXhdKS5oYXNDbGFzcygnc2VsZWN0ZWQnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IGluZGV4O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRXhlY3V0ZSBjYWxsYmFjayB0byBub3RpZnkgYWJvdXQgaXRlbSBzZWxlY3RcclxuICAgICAgICAgICAgaWYgKG9sZFNlbGVjdGVkSW5kZXggIT0gdGhpcy5zZWxlY3RlZEluZGV4ICYmIHRoaXMuc2VsZWN0ZWRJbmRleCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRhcHBseSh1cGRhdGVJbmRleCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS4kYXBwbHkob25TZWxlY3QpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGVJbmRleCgpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkSXRlbSA9IGFuZ3VsYXIuZWxlbWVudChpdGVtc1t0aGlzLnNlbGVjdGVkSW5kZXhdKSxcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZElkID0gc2VsZWN0ZWRJdGVtLmF0dHIoJ3BpcC1pZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluZGV4U2V0dGVyKSB0aGlzLmluZGV4U2V0dGVyKHRoaXMuJHNjb3BlLCB0aGlzLnNlbGVjdGVkSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaWRTZXR0ZXIpIHRoaXMuaWRTZXR0ZXIodGhpcy4kc2NvcGUsIHNlbGVjdGVkSWQpO1xyXG4gICAgICAgICAgICAgICAgb25TZWxlY3QoKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIG9uU2VsZWN0KCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW1zW3RoaXMuc2VsZWN0ZWRJbmRleF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBzZWxlY3RlZEl0ZW0uYXR0cigncGlwLWlkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY2hhbmdlR2V0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VHZXR0ZXIodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHRoaXMuJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtOiBzZWxlY3RlZEl0ZW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogdGhpcy5zZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHNlbGVjdGVkSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJbmRleDogdGhpcy5zZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkSW5kZXg6IG9sZFNlbGVjdGVkSW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxUb0l0ZW0oJGl0ZW0pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubm9TY3JvbGwgfHwgISRpdGVtLm9mZnNldCgpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBjb25zdFxyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyVG9wID0gdGhpcy4kZWxlbWVudC5vZmZzZXQoKS50b3AsXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJIZWlnaHQgPSB0aGlzLiRlbGVtZW50LmhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gY29udGFpbmVyVG9wICsgY29udGFpbmVySGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgaXRlbVRvcCA9ICRpdGVtLm9mZnNldCgpLnRvcCxcclxuICAgICAgICAgICAgICAgIGl0ZW1IZWlnaHQgPSAkaXRlbS5vdXRlckhlaWdodCh0cnVlKSxcclxuICAgICAgICAgICAgICAgIGl0ZW1Cb3R0b20gPSBpdGVtVG9wICsgaXRlbUhlaWdodCxcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbFRvcCA9IHRoaXMuJGVsZW1lbnQuc2Nyb2xsVG9wKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmlzU2Nyb2xsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLiR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNTY3JvbGxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbnRhaW5lclRvcCA+IGl0ZW1Ub3ApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIGl0ZW1Ub3AgLSBjb250YWluZXJUb3ApO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnRhaW5lckJvdHRvbSA8IGl0ZW1Cb3R0b20pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIGl0ZW1Cb3R0b20gLSBjb250YWluZXJCb3R0b20pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRUYXJnZXRFbGVtZW50RnJvbUV2ZW50VGFyZ2V0KGV2ZW50VGFyZ2V0KSB7XHJcbiAgICAgICAgICAgIC8vIE9uIHNvbWUgb2xkZXIgYnJvd3NlcnMgdGhlIGV2ZW50IHRhcmdldCBtYXkgYmUgYSB0ZXh0IG5vZGUuXHJcbiAgICAgICAgICAgIGlmIChldmVudFRhcmdldC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBldmVudFRhcmdldC5wYXJlbnROb2RlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZXZlbnRUYXJnZXQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSB0b3VjaEhhc01vdmVkKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRvdWNoID0gZXZlbnQuY2hhbmdlZFRvdWNoZXNbMF0sXHJcbiAgICAgICAgICAgICAgICBib3VuZGFyeSA9IHRoaXMudG91Y2hCb3VuZGFyeTsgLy8gVG91Y2htb3ZlIGJvdW5kYXJ5LCBiZXlvbmQgd2hpY2ggYSBjbGljayB3aWxsIGJlIGNhbmNlbGxlZC5cclxuXHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyh0b3VjaC5wYWdlWCAtIHRoaXMudG91Y2hTdGFydFgpID4gYm91bmRhcnkgfHwgTWF0aC5hYnModG91Y2gucGFnZVkgLSB0aGlzLnRvdWNoU3RhcnRZKSA+IGJvdW5kYXJ5KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25DbGlja0V2ZW50KGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICBpdGVtOiBldmVudC5jdXJyZW50VGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgcmFpc2VFdmVudDogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Ub3VjaFN0YXJ0KGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGV2ID0gZXZlbnQub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgaWYgKGV2Wyd0YXJnZXRUb3VjaGVzJ10ubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RWxlbWVudCA9IHRoaXMuZ2V0VGFyZ2V0RWxlbWVudEZyb21FdmVudFRhcmdldChldi50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgdG91Y2ggPSBldlsndGFyZ2V0VG91Y2hlcyddWzBdO1xyXG5cclxuICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrU3RhcnQgPSBldi50aW1lU3RhbXA7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQ7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRvdWNoU3RhcnRYID0gdG91Y2gucGFnZVg7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2hTdGFydFkgPSB0b3VjaC5wYWdlWTtcclxuXHJcbiAgICAgICAgICAgIC8qaWYgKChldi50aW1lU3RhbXAgLSB0aGlzLmxhc3RDbGlja1RpbWUpIDwgdGhpcy50YXBkZWxheSkge1xyXG4gICAgICAgICAgICAgICAgLy8gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIH0qL1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uVG91Y2hNb3ZlKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy50cmFja2luZ0NsaWNrKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBldiA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAgICAgICAgIC8vIElmIHRoZSB0b3VjaCBoYXMgbW92ZWQsIGNhbmNlbCB0aGUgY2xpY2sgdHJhY2tpbmdcclxuICAgICAgICAgICAgaWYgKHRoaXMudGFyZ2V0RWxlbWVudCAhPT0gdGhpcy5nZXRUYXJnZXRFbGVtZW50RnJvbUV2ZW50VGFyZ2V0KGV2LnRhcmdldCkgfHwgdGhpcy50b3VjaEhhc01vdmVkKGV2KSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRhcmdldEVsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Ub3VjaEVuZChldmVudCkge1xyXG4gICAgICAgICAgICBsZXQgZm9yRWxlbWVudCwgbmV3VHJhY2tpbmdDbGlja1N0YXJ0LCB0YXJnZXRUYWdOYW1lLCBzY3JvbGxQYXJlbnQsIHRvdWNoLCBuZXd0YXJnZXRFbGVtZW50ID0gdGhpcy50YXJnZXRFbGVtZW50O1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLnRyYWNraW5nQ2xpY2spIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGV2ID0gZXZlbnQub3JpZ2luYWxFdmVudDtcclxuICAgICAgICAgICAgLy8gUHJldmVudCBwaGFudG9tIGNsaWNrcyBvbiBmYXN0IGRvdWJsZS10YXAgXHJcbiAgICAgICAgICAgIGlmICgoZXYudGltZVN0YW1wIC0gdGhpcy5sYXN0Q2xpY2tUaW1lKSA8IHRoaXMudGFwZGVsYXkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsTmV4dENsaWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoKGV2LnRpbWVTdGFtcCAtIHRoaXMudHJhY2tpbmdDbGlja1N0YXJ0KSA+IHRoaXMudGFwVGltZW91dCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFJlc2V0IHRvIHByZXZlbnQgd3JvbmcgY2xpY2sgY2FuY2VsIG9uIGlucHV0IFxyXG4gICAgICAgICAgICB0aGlzLmNhbmNlbE5leHRDbGljayA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5sYXN0Q2xpY2tUaW1lID0gZXZlbnQudGltZVN0YW1wO1xyXG5cclxuICAgICAgICAgICAgbmV3VHJhY2tpbmdDbGlja1N0YXJ0ID0gdGhpcy50cmFja2luZ0NsaWNrU3RhcnQ7XHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tpbmdDbGljayA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2tTdGFydCA9IDA7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgaXRlbTogZXZlbnQuY3VycmVudFRhcmdldCxcclxuICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uVG91Y2hDYW5jZWwoZXZlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0RWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uS2V5RG93bihldmVudCkge1xyXG4gICAgICAgICAgICB2YXIga2V5Q29kZSA9IGV2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGU7XHJcblxyXG4gICAgICAgICAgICAvLyBDaGVjayBjb250cm9sIGtleUNvZGVcclxuICAgICAgICAgICAgaWYgKGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5FTlRFUiB8fCBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuU1BBQ0UpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5lbnRlclNwYWNlR2V0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbnRlclNwYWNlR2V0dGVyKHRoaXMuJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB0aGlzLiRlbGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6IHRoaXMuc2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW06IHRoaXMuJGVsZW1lbnQuZmluZCgnLnNlbGVjdGVkJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgIGlmIChrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuTEVGVF9BUlJPVyB8fCBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5VUF9BUlJPVyB8fCBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPV1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBHZXQgbmV4dCBzZWxlY3RhYmxlIGNvbnRyb2wgaW5kZXhcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy4kZWxlbWVudC5maW5kKHRoaXMuY2xhc3NOYW1lICsgdGhpcy5tb2RpZmllciksXHJcbiAgICAgICAgICAgICAgICAgICAgaW5jID0gKGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fCBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykgPyAxIDogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0ZWRJbmRleCA9IHRoaXMuc2VsZWN0ZWRJbmRleCArIGluYztcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBTZXQgbmV4dCBjb250cm9sIGFzIHNlbGVjdGVkXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogbmV3U2VsZWN0ZWRJbmRleCxcclxuICAgICAgICAgICAgICAgICAgICBpdGVtczogaXRlbXMsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFpc2VFdmVudDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Gb2N1c0luKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIC8vIENob29zZSBzZWxlY3RlZCBlbGVtZW50XHJcbiAgICAgICAgICAgIGxldCBpdGVtcyxcclxuICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbSA9IHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSArICcuc2VsZWN0ZWQnKTtcclxuXHJcbiAgICAgICAgICAgIHNlbGVjdGVkSXRlbS5hZGRDbGFzcygnbWQtZm9jdXNlZCcpO1xyXG5cclxuICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vdCBzZWxlY3RlZCBlbGVtZW50cyB0aGVuIHBpY2sgdGhlIGZpcnN0IG9uZVxyXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gdGhpcy5pbmRleEdldHRlcih0aGlzLiRzY29wZSk7XHJcbiAgICAgICAgICAgICAgICBpdGVtcyA9IHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSArIHRoaXMubW9kaWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXg6IHRoaXMuc2VsZWN0ZWRJbmRleCB8fCAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiBpdGVtcyxcclxuICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkZvY3VzT3V0KGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSArICcubWQtZm9jdXNlZCcgKyB0aGlzLm1vZGlmaWVyKS5yZW1vdmVDbGFzcygnbWQtZm9jdXNlZCcpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBTZWxlY3RlZCA9IGZ1bmN0aW9uIChcclxuICAgICAgICAkcGFyc2U6IG5nLklQYXJzZVNlcnZpY2UsXHJcbiAgICAgICAgJG1kQ29uc3RhbnQ6IGFueSxcclxuICAgICAgICAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlXHJcbiAgICApOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBzY29wZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChcclxuICAgICAgICAgICAgICAgICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgICAgICRhdHRyczogU2VsZWN0ZWRBdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgbmV3IFNlbGVjdGVkTGluaygkcGFyc2UsICRtZENvbnN0YW50LCAkdGltZW91dCwgJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcInBpcFNlbGVjdGVkXCIsIFtdKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcFNlbGVjdGVkJywgU2VsZWN0ZWQpO1xyXG59IiwiaW1wb3J0IHsgU2hvcnRjdXRPcHRpb25zIH0gZnJvbSBcIi4vU2hvcnRjdXRcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dEl0ZW0ge1xyXG4gICAgLy8gU2hvcnRjdXQgY29tYmluYXRpb25cclxuICAgIHB1YmxpYyBzaG9ydGN1dDogc3RyaW5nO1xyXG4gICAgLy8gVGFyZ2V0IG9iamVjdCBcclxuICAgIHB1YmxpYyB0YXJnZXQ/OiBhbnk7XHJcbiAgICAvLyBUYXJnZXQgZWxlbWVudCBieSBJZFxyXG4gICAgcHVibGljIHRhcmdldElkPzogc3RyaW5nO1xyXG4gICAgLy8gVGFyZ2V0IGVsZW1lbnQgYnkgY2xhc3MgKGZpcnN0ZWxlbWVudD8/KVxyXG4gICAgLy8gUHVibGljIHRhcmdldENsYXNzPzogc3RyaW5nO1xyXG4gICAgLy8gQWNjZXNzIGZ1bmN0aW9uXHJcbiAgICBwdWJsaWMgYWNjZXNzPzogKGV2ZW50OiBKUXVlcnlFdmVudE9iamVjdCkgPT4gYm9vbGVhbjtcclxuICAgIC8vIFdpbmRvdy5sb2NhdGlvbi5ocmVmXHJcbiAgICBwdWJsaWMgaHJlZj86IHN0cmluZztcclxuICAgIC8vICRsb2NhdGlvbi51cmxcclxuICAgIHB1YmxpYyB1cmw/OiBzdHJpbmc7XHJcbiAgICAvLyAkc3RhdGUuZ28oc3RhdGUsIHN0YXRlUGFyYW1zKVxyXG4gICAgcHVibGljIHN0YXRlPzogc3RyaW5nO1xyXG4gICAgLy8gUGFyYW1ldGVycyBmb3IgJHN0YXRlLmdvKHN0YXRlLCBzdGF0ZVBhcmFtcylcclxuICAgIHB1YmxpYyBzdGF0ZVBhcmFtcz86IGFueTtcclxuICAgIC8vICRyb290U2NvcGUuYnJvYWRjYXN0KGV2ZW50KVxyXG4gICAgcHVibGljIGV2ZW50Pzogc3RyaW5nO1xyXG4gICAgLy8gQ2xpY2sgY2FsbGJhY2tcclxuICAgIHB1YmxpYyBrZXlwcmVzcz86IChldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWQ7XHJcbiAgICAvLyBEZWZhdWx0IG9wdGlvbnNcclxuICAgIHB1YmxpYyBvcHRpb25zPzogU2hvcnRjdXRPcHRpb25zOyAgICBcclxufVxyXG5cclxuLy8gZXhwb3J0IGNsYXNzIFNob3J0Y3V0SXRlbSBleHRlbmRzIFNpbXBsZVNob3J0Y3V0SXRlbSB7XHJcbi8vICAgICBwdWJsaWMgc2hvcnRjdXRzOiBTaW1wbGVTaG9ydGN1dEl0ZW1bXTtcclxuLy8gfVxyXG5cclxuZXhwb3J0IGNsYXNzIFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAvLyBHbG9iYWwgc2hvcnRjdXQgXHJcbiAgICBwdWJsaWMgZ2xvYmFsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXSA9IFtdO1xyXG4gICAgLy8gTG9jYWwgc2hvcnRjdXQgXHJcbiAgICBwdWJsaWMgbG9jYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdID0gW107XHJcbiAgICAvLyBEZWZhdWx0IG9wdGlvbnNcclxuICAgIHB1YmxpYyBkZWZhdWx0T3B0aW9uczogU2hvcnRjdXRPcHRpb25zID0gbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzU2VydmljZSB7XHJcbiAgICByZWFkb25seSBjb25maWc6IFNob3J0Y3V0c0NvbmZpZztcclxuXHJcbiAgICBnbG9iYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG4gICAgbG9jYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElTaG9ydGN1dHNQcm92aWRlciBleHRlbmRzIG5nLklTZXJ2aWNlUHJvdmlkZXIge1xyXG4gICAgY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcbiAgICBcclxuICAgIGdsb2JhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW107XHJcbiAgICBkZWZhdWx0T3B0aW9uczogU2hvcnRjdXRPcHRpb25zO1xyXG59XHJcbiIsImV4cG9ydCBjbGFzcyBLZXlib2FyZEV2ZW50IHtcclxuICAgIHN0YXRpYyBLZXlkb3duOiBzdHJpbmcgPSAna2V5ZG93bic7XHJcbiAgICBzdGF0aWMgS2V5dXA6IHN0cmluZyA9ICdrZXl1cCc7XHJcbiAgICBzdGF0aWMgS2V5cHJlc3M6IHN0cmluZyA9ICdrZXlwcmVzcyc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dE9wdGlvbnMge1xyXG4gICAgVHlwZTogS2V5Ym9hcmRFdmVudDtcclxuICAgIFByb3BhZ2F0ZTogYm9vbGVhbjtcclxuICAgIERpc2FibGVJbklucHV0OiBib29sZWFuO1xyXG4gICAgVGFyZ2V0OiBhbnk7IC8vIEV2ZW50IHRhcmdldCBvYmplY3RcclxuICAgIEtleWNvZGU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNob3J0Y3V0IHtcclxuICAgIHByaXZhdGUgc2hpZnRfbnVtcyA9IHtcclxuICAgICAgICBcImBcIjogXCJ+XCIsXHJcbiAgICAgICAgXCIxXCI6IFwiIVwiLFxyXG4gICAgICAgIFwiMlwiOiBcIkBcIixcclxuICAgICAgICBcIjNcIjogXCIjXCIsXHJcbiAgICAgICAgXCI0XCI6IFwiJFwiLFxyXG4gICAgICAgIFwiNVwiOiBcIiVcIixcclxuICAgICAgICBcIjZcIjogXCJeXCIsXHJcbiAgICAgICAgXCI3XCI6IFwiJlwiLFxyXG4gICAgICAgIFwiOFwiOiBcIipcIixcclxuICAgICAgICBcIjlcIjogXCIoXCIsXHJcbiAgICAgICAgXCIwXCI6IFwiKVwiLFxyXG4gICAgICAgIFwiLVwiOiBcIl9cIixcclxuICAgICAgICBcIj1cIjogXCIrXCIsXHJcbiAgICAgICAgXCI7XCI6IFwiOlwiLFxyXG4gICAgICAgIFwiJ1wiOiBcIlxcXCJcIixcclxuICAgICAgICBcIixcIjogXCI8XCIsXHJcbiAgICAgICAgXCIuXCI6IFwiPlwiLFxyXG4gICAgICAgIFwiL1wiOiBcIj9cIixcclxuICAgICAgICBcIlxcXFxcIjogXCJ8XCJcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBzcGVjaWFsX2tleXMgPSB7XHJcbiAgICAgICAgJ2VzYyc6IDI3LFxyXG4gICAgICAgICdlc2NhcGUnOiAyNyxcclxuICAgICAgICAndGFiJzogOSxcclxuICAgICAgICAnc3BhY2UnOiAzMixcclxuICAgICAgICAncmV0dXJuJzogMTMsXHJcbiAgICAgICAgJ2VudGVyJzogMTMsXHJcbiAgICAgICAgJ2JhY2tzcGFjZSc6IDgsXHJcblxyXG4gICAgICAgICdzY3JvbGxsb2NrJzogMTQ1LFxyXG4gICAgICAgICdzY3JvbGxfbG9jayc6IDE0NSxcclxuICAgICAgICAnc2Nyb2xsJzogMTQ1LFxyXG4gICAgICAgICdjYXBzbG9jayc6IDIwLFxyXG4gICAgICAgICdjYXBzX2xvY2snOiAyMCxcclxuICAgICAgICAnY2Fwcyc6IDIwLFxyXG4gICAgICAgICdudW1sb2NrJzogMTQ0LFxyXG4gICAgICAgICdudW1fbG9jayc6IDE0NCxcclxuICAgICAgICAnbnVtJzogMTQ0LFxyXG5cclxuICAgICAgICAncGF1c2UnOiAxOSxcclxuICAgICAgICAnYnJlYWsnOiAxOSxcclxuXHJcbiAgICAgICAgJ2luc2VydCc6IDQ1LFxyXG4gICAgICAgICdob21lJzogMzYsXHJcbiAgICAgICAgJ2RlbGV0ZSc6IDQ2LFxyXG4gICAgICAgICdlbmQnOiAzNSxcclxuXHJcbiAgICAgICAgJ3BhZ2V1cCc6IDMzLFxyXG4gICAgICAgICdwYWdlX3VwJzogMzMsXHJcbiAgICAgICAgJ3B1JzogMzMsXHJcblxyXG4gICAgICAgICdwYWdlZG93bic6IDM0LFxyXG4gICAgICAgICdwYWdlX2Rvd24nOiAzNCxcclxuICAgICAgICAncGQnOiAzNCxcclxuXHJcbiAgICAgICAgJ2xlZnQnOiAzNyxcclxuICAgICAgICAndXAnOiAzOCxcclxuICAgICAgICAncmlnaHQnOiAzOSxcclxuICAgICAgICAnZG93bic6IDQwLFxyXG5cclxuICAgICAgICAnZjEnOiAxMTIsXHJcbiAgICAgICAgJ2YyJzogMTEzLFxyXG4gICAgICAgICdmMyc6IDExNCxcclxuICAgICAgICAnZjQnOiAxMTUsXHJcbiAgICAgICAgJ2Y1JzogMTE2LFxyXG4gICAgICAgICdmNic6IDExNyxcclxuICAgICAgICAnZjcnOiAxMTgsXHJcbiAgICAgICAgJ2Y4JzogMTE5LFxyXG4gICAgICAgICdmOSc6IDEyMCxcclxuICAgICAgICAnZjEwJzogMTIxLFxyXG4gICAgICAgICdmMTEnOiAxMjIsXHJcbiAgICAgICAgJ2YxMic6IDEyM1xyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIG1vZGlmaWVycyA9IHtcclxuICAgICAgICBzaGlmdDogeyB3YW50ZWQ6IGZhbHNlLCBwcmVzc2VkOiBmYWxzZSB9LFxyXG4gICAgICAgIGN0cmw6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfSxcclxuICAgICAgICBhbHQ6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfSxcclxuICAgICAgICBtZXRhOiB7IHdhbnRlZDogZmFsc2UsIHByZXNzZWQ6IGZhbHNlIH1cdC8vIE1ldGEgaXMgTWFjIHNwZWNpZmljXHJcbiAgICB9O1xyXG5cclxuICAgIHB1YmxpYyBldmVudENhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgIHB1YmxpYyB0YXJnZXQ6IGFueTtcclxuICAgIHB1YmxpYyBldmVudDogS2V5Ym9hcmRFdmVudDtcclxuICAgIHB1YmxpYyBvcHRpb246IFNob3J0Y3V0T3B0aW9ucztcclxuICAgIHB1YmxpYyBzaG9yY3V0OiBzdHJpbmc7XHJcbiAgICBwdWJsaWMgY2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICBlbGVtZW50OiBhbnksXHJcbiAgICAgICAgc2hvcmN1dENvbWJpbmF0aW9uOiBzdHJpbmcsXHJcbiAgICAgICAgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMsXHJcbiAgICAgICAgY2FsbGJhY2s6IChlPzogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWRcclxuICAgICkge1xyXG4gICAgICAgIFwibmdJbmplY3RcIjtcclxuXHJcbiAgICAgICAgdGhpcy50YXJnZXQgPSBlbGVtZW50O1xyXG4gICAgICAgIHRoaXMuc2hvcmN1dCA9IHNob3JjdXRDb21iaW5hdGlvbjtcclxuICAgICAgICB0aGlzLmV2ZW50ID0gb3B0aW9uLlR5cGU7XHJcbiAgICAgICAgdGhpcy5vcHRpb24gPSBvcHRpb247XHJcbiAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG5cclxuICAgICAgICB0aGlzLmV2ZW50Q2FsbGJhY2sgPSAoZXZlbnQ6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBlOiBKUXVlcnlFdmVudE9iamVjdCA9IGV2ZW50IHx8IDxKUXVlcnlFdmVudE9iamVjdD53aW5kb3cuZXZlbnQ7XHJcbiAgICAgICAgICAgIGxldCBjb2RlOiBudW1iZXI7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb24uRGlzYWJsZUluSW5wdXQpIHsgLy8gRGlzYWJsZSBzaG9ydGN1dCBrZXlzIGluIElucHV0LCBUZXh0YXJlYSBmaWVsZHNcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGUudGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlLnNyY0VsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZS5zcmNFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50Lm5vZGVUeXBlID09IDMpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQudGFnTmFtZSA9PSAnSU5QVVQnIHx8IGVsZW1lbnQudGFnTmFtZSA9PSAnVEVYVEFSRUEnKSByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gRmluZCBXaGljaCBrZXkgaXMgcHJlc3NlZFxyXG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gZS5rZXlDb2RlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUud2hpY2gpIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBlLndoaWNoO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgY2hhcmFjdGVyID0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvZGUgPT0gMTg4KSBjaGFyYWN0ZXIgPSBcIixcIjsgLy8gSWYgdGhlIHVzZXIgcHJlc3Nlcywgd2hlbiB0aGUgdHlwZSBpcyBvbmtleWRvd25cclxuICAgICAgICAgICAgaWYgKGNvZGUgPT0gMTkwKSBjaGFyYWN0ZXIgPSBcIi5cIjsgLy8gSWYgdGhlIHVzZXIgcHJlc3Nlcywgd2hlbiB0aGUgdHlwZSBpcyBvbmtleWRvd25cclxuXHJcbiAgICAgICAgICAgIGxldCBrZXlzOiBzdHJpbmdbXSA9IHRoaXMuc2hvcmN1dC5zcGxpdChcIitcIik7XHJcbiAgICAgICAgICAgIC8vIEtleSBQcmVzc2VkIC0gY291bnRzIHRoZSBudW1iZXIgb2YgdmFsaWQga2V5cHJlc3NlcyAtIGlmIGl0IGlzIHNhbWUgYXMgdGhlIG51bWJlciBvZiBrZXlzLCB0aGUgc2hvcnRjdXQgZnVuY3Rpb24gaXMgaW52b2tlZFxyXG4gICAgICAgICAgICBsZXQga3A6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgICAgICBpZiAoZS5jdHJsS2V5KSB0aGlzLm1vZGlmaWVycy5jdHJsLnByZXNzZWQgPSBlLmN0cmxLZXk7XHJcbiAgICAgICAgICAgIGlmIChlLnNoaWZ0S2V5KSB0aGlzLm1vZGlmaWVycy5zaGlmdC5wcmVzc2VkID0gZS5zaGlmdEtleTtcclxuICAgICAgICAgICAgaWYgKGUuYWx0S2V5KSB0aGlzLm1vZGlmaWVycy5hbHQucHJlc3NlZCA9IGUuYWx0S2V5O1xyXG4gICAgICAgICAgICBpZiAoZS5tZXRhS2V5KSB0aGlzLm1vZGlmaWVycy5tZXRhLnByZXNzZWQgPSBlLm1ldGFLZXk7XHJcblxyXG4gICAgICAgICAgICBsZXQgaTogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGxldCBrOiBzdHJpbmcgPSBrZXlzW2ldO1xyXG4gICAgICAgICAgICAgICAgLy8gTW9kaWZpZXJzXHJcbiAgICAgICAgICAgICAgICBpZiAoayA9PSAnY3RybCcgfHwgayA9PSAnY29udHJvbCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmN0cmwud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoayA9PSAnc2hpZnQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5zaGlmdC53YW50ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrID09ICdhbHQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5hbHQud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoayA9PSAnbWV0YScpIHtcclxuICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLm1ldGEud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoay5sZW5ndGggPiAxKSB7IC8vIElmIGl0IGlzIGEgc3BlY2lhbCBrZXlcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zcGVjaWFsX2tleXNba10gPT0gY29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb24uS2V5Y29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbi5LZXljb2RlID09IGNvZGUpIGtwKys7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyBUaGUgc3BlY2lhbCBrZXlzIGRpZCBub3QgbWF0Y2hcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhcmFjdGVyID09IGspIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNoaWZ0X251bXNbY2hhcmFjdGVyXSAmJiBlLnNoaWZ0S2V5KSB7IC8vIFN0dXBpZCBTaGlmdCBrZXkgYnVnIGNyZWF0ZWQgYnkgdXNpbmcgbG93ZXJjYXNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFyYWN0ZXIgPSB0aGlzLnNoaWZ0X251bXNbY2hhcmFjdGVyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGFyYWN0ZXIgPT0gaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChrcCA9PSBrZXlzLmxlbmd0aCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuY3RybC5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLmN0cmwud2FudGVkICYmXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5zaGlmdC5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLnNoaWZ0LndhbnRlZCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuYWx0LnByZXNzZWQgPT0gdGhpcy5tb2RpZmllcnMuYWx0LndhbnRlZCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMubWV0YS5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLm1ldGEud2FudGVkKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxsYmFjayhlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMub3B0aW9uLlByb3BhZ2F0ZSkgeyAvLyBTdG9wIHRoZSBldmVudFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGUuY2FuY2VsQnViYmxlIGlzIHN1cHBvcnRlZCBieSBJRSAtIHRoaXMgd2lsbCBraWxsIHRoZSBidWJibGluZyBwcm9jZXNzLlxyXG4gICAgICAgICAgICAgICAgICAgIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBlLnJldHVyblZhbHVlID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGUuc3RvcFByb3BhZ2F0aW9uIHdvcmtzIGluIEZpcmVmb3guXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5jdHJsLnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuc2hpZnQucHJlc3NlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5hbHQucHJlc3NlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5tZXRhLnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7IFNob3J0Y3V0LCBTaG9ydGN1dE9wdGlvbnMsIEtleWJvYXJkRXZlbnQgfSBmcm9tIFwiLi9TaG9ydGN1dFwiO1xyXG5pbXBvcnQgeyBJS2V5Ym9hcmRTaG9ydGN1dHMsIElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlLCBJU2hvcnRjdXRCaW5kaW5nUHJvdmlkZXIgfSBmcm9tICcuL0lTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlIGltcGxlbWVudHMgSVNob3J0Y3V0QmluZGluZ1NlcnZpY2Uge1xyXG4gICAgcHJpdmF0ZSBfbG9nOiBuZy5JTG9nU2VydmljZTtcclxuICAgIHByaXZhdGUgX2RlZmF1bHRPcHRpb246IFNob3J0Y3V0T3B0aW9ucztcclxuICAgIHByaXZhdGUgX3Nob3J0Y3V0czogSUtleWJvYXJkU2hvcnRjdXRzID0ge307XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgIG9wdGlvbjogU2hvcnRjdXRPcHRpb25zXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcbiAgICAgICAgdGhpcy5fbG9nID0gJGxvZztcclxuICAgICAgICB0aGlzLl9kZWZhdWx0T3B0aW9uID0gb3B0aW9uID8gXy5kZWZhdWx0cyhvcHRpb24sIHRoaXMuZ2V0RGVmYXVsdE9wdGlvbigpKSA6IHRoaXMuZ2V0RGVmYXVsdE9wdGlvbigpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0RGVmYXVsdE9wdGlvbigpOiBTaG9ydGN1dE9wdGlvbnMge1xyXG4gICAgICAgIGxldCBkZWZhdWx0T3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIFR5cGU6IEtleWJvYXJkRXZlbnQuS2V5ZG93bixcclxuICAgICAgICAgICAgUHJvcGFnYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgRGlzYWJsZUluSW5wdXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBUYXJnZXQ6IGRvY3VtZW50LFxyXG4gICAgICAgICAgICBLZXljb2RlOiBudWxsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRPcHRpb247XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBzaG9ydGN1dHMoKTogSUtleWJvYXJkU2hvcnRjdXRzIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhZGQoc2hvcnRjdXQ6IHN0cmluZywgY2FsbGJhY2s6IChlOiBKUXVlcnlFdmVudE9iamVjdCkgPT4gdm9pZCwgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnJlbW92ZShzaG9ydGN1dCk7XHJcbiAgICAgICAgbGV0IHNob3J0Y3V0T3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMgPSBvcHRpb24gPyBfLmRlZmF1bHRzKG9wdGlvbiwgdGhpcy5fZGVmYXVsdE9wdGlvbikgOiB0aGlzLl9kZWZhdWx0T3B0aW9uO1xyXG4gICAgICAgIGxldCBzaG9ydGN1dENvbWJpbmF0aW9uOiBzdHJpbmcgPSBzaG9ydGN1dC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgIGxldCBlbGVtZW50ID0gc2hvcnRjdXRPcHRpb24uVGFyZ2V0O1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIHNob3J0Y3V0T3B0aW9uLlRhcmdldCA9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2hvcnRjdXRPcHRpb24uVGFyZ2V0KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlbGVtZW50ID0gc2hvcnRjdXRPcHRpb24uVGFyZ2V0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2xvZy5lcnJvcignUmVnaXN0ZXIgc2hvcnRjdXQ6IGVsZW1lbnQgdW5kZW50aWZpZWQhJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghc2hvcnRjdXRDb21iaW5hdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1JlZ2lzdGVyIHNob3J0Y3V0OiBzaG9ydGN1dCBjb21iaW5hdGlvbiB1bmRlbnRpZmllZCEnKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFjYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0aGlzLl9sb2cuZXJyb3IoJ1JlZ2lzdGVyIHNob3J0Y3V0OiBzaG9yY3V0IGNhbGxiYWNrIHVuZGVudGlmaWVkIScpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbmV3S2V5Ym9hcmRTaG9ydGN1dCA9IG5ldyBTaG9ydGN1dChlbGVtZW50LCBzaG9ydGN1dENvbWJpbmF0aW9uLCBzaG9ydGN1dE9wdGlvbiwgY2FsbGJhY2spO1xyXG5cclxuICAgICAgICB0aGlzLl9zaG9ydGN1dHNbc2hvcnRjdXRDb21iaW5hdGlvbl0gPSBuZXdLZXlib2FyZFNob3J0Y3V0O1xyXG5cclxuICAgICAgICAvL0F0dGFjaCB0aGUgZnVuY3Rpb24gd2l0aCB0aGUgZXZlbnRcclxuICAgICAgICBpZiAoZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihzaG9ydGN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYXR0YWNoRXZlbnQpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5hdHRhY2hFdmVudCgnb24nICsgc2hvcnRjdXRPcHRpb24uVHlwZSwgbmV3S2V5Ym9hcmRTaG9ydGN1dC5ldmVudENhbGxiYWNrKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlbGVtZW50Lm9uKHNob3J0Y3V0T3B0aW9uLlR5cGUsIG5ld0tleWJvYXJkU2hvcnRjdXQuZXZlbnRDYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyByZW1vdmUoc2hvcmN1dDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IHNob3J0Y3V0Q29tYmluYXRpb24gPSBzaG9yY3V0LnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgbGV0IGJpbmRpbmc6IFNob3J0Y3V0ID0gdGhpcy5fc2hvcnRjdXRzW3Nob3J0Y3V0Q29tYmluYXRpb25dO1xyXG5cclxuICAgICAgICBkZWxldGUodGhpcy5fc2hvcnRjdXRzW3Nob3J0Y3V0Q29tYmluYXRpb25dKVxyXG4gICAgICAgIGlmICghYmluZGluZykgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgdHlwZSA9IGJpbmRpbmcuZXZlbnQ7XHJcbiAgICAgICAgbGV0IGVsZW1lbnQgPSBiaW5kaW5nLnRhcmdldDtcclxuICAgICAgICBsZXQgY2FsbGJhY2sgPSBiaW5kaW5nLmV2ZW50Q2FsbGJhY2s7XHJcblxyXG4gICAgICAgIGlmIChlbGVtZW50LmRldGFjaEV2ZW50KSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuZGV0YWNoRXZlbnQoJ29uJyArIHR5cGUsIGNhbGxiYWNrKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xyXG4gICAgICAgICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBlbGVtZW50WydvbicgKyB0eXBlXSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBlbGVtZW50Lm9mZih0eXBlLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTaG9ydGN1dEJpbmRpbmdQcm92aWRlciBpbXBsZW1lbnRzIElTaG9ydGN1dEJpbmRpbmdQcm92aWRlciB7XHJcbiAgICBwcml2YXRlIF9zZXJ2aWNlOiBTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlO1xyXG4gICAgcHJpdmF0ZSBfb3B0aW9uOiBTaG9ydGN1dE9wdGlvbnM7XHJcblxyXG4gICAgcHVibGljIGdldCBvcHRpb24oKTogU2hvcnRjdXRPcHRpb25zIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fb3B0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgb3B0aW9uKHZhbHVlOiBTaG9ydGN1dE9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLl9vcHRpb24gPSB2YWx1ZSB8fCBuZXcgU2hvcnRjdXRPcHRpb25zKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljICRnZXQoXHJcbiAgICAgICAgJGxvZzogbmcuSUxvZ1NlcnZpY2VcclxuICAgICkge1xyXG4gICAgICAgIFwibmdJbmplY3RcIjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX3NlcnZpY2UgPT0gbnVsbClcclxuICAgICAgICAgICAgdGhpcy5fc2VydmljZSA9IG5ldyBTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlKCRsb2csIHRoaXMuX29wdGlvbik7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLl9zZXJ2aWNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5hbmd1bGFyXHJcbiAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgLnByb3ZpZGVyKCdwaXBTaG9ydGN1dEJpbmRpbmcnLCBTaG9ydGN1dEJpbmRpbmdQcm92aWRlcik7XHJcbiIsImltcG9ydCB7IFNob3J0Y3V0T3B0aW9ucyB9IGZyb20gXCIuL1Nob3J0Y3V0XCI7XHJcbmltcG9ydCB7IElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlIH0gZnJvbSBcIi4vSVNob3J0Y3V0QmluZGluZ1NlcnZpY2VcIjtcclxuXHJcbmludGVyZmFjZSBTaG9ydGN1dEF0dHJpYnV0ZXMgZXh0ZW5kcyBuZy5JQXR0cmlidXRlcyB7XHJcbiAgICBwaXBTaG9ydGN1dEFjdGlvbjogYW55O1xyXG4gICAgcGlwU2hvcnRjdXROYW1lOiBhbnk7XHJcbiAgICBwaXBTaG9yY3V0T3B0aW9uczogU2hvcnRjdXRPcHRpb25zO1xyXG59XHJcblxyXG5jbGFzcyBTaG9ydGN1dENvbnRyb2xsZXIgaW1wbGVtZW50cyBuZy5JQ29udHJvbGxlciAge1xyXG4gICAgcHJpdmF0ZSBhY3Rpb25TaG9ydGN1dHM6IEZ1bmN0aW9uO1xyXG4gICAgcHJpdmF0ZSBuYW1lU2hvcnRjdXRzOiBzdHJpbmc7XHJcbiAgICBwcml2YXRlIG9wdGlvbnM6IFNob3J0Y3V0T3B0aW9ucztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICRhdHRyczogU2hvcnRjdXRBdHRyaWJ1dGVzLFxyXG4gICAgICAgICRzY29wZTogbmcuSVNjb3BlLFxyXG4gICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICBwaXBTaG9ydGN1dEJpbmRpbmc6IElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgIGlmICgkYXR0cnMucGlwU2hvcnRjdXRBY3Rpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMgPSAkcGFyc2UoJGF0dHJzLnBpcFNob3J0Y3V0QWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMoJHNjb3BlLCB7JGV2ZW50OiB7fX0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICRsb2cuZXJyb3IoJ1Nob3J0Y3V0IGFjdGlvbiBkb2VzIG5vdCBzZXQuJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICgkYXR0cnMucGlwU2hvcnRjdXROYW1lICYmIF8uaXNTdHJpbmcoJGF0dHJzLnBpcFNob3J0Y3V0TmFtZSkpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lU2hvcnRjdXRzID0gJGF0dHJzLnBpcFNob3J0Y3V0TmFtZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAkbG9nLmVycm9yKCdTaG9ydGN1dCBuYW1lIGRvZXMgbm90IHNldC4nKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5vcHRpb25zID0gJGF0dHJzLnBpcFNob3JjdXRPcHRpb25zID8gPFNob3J0Y3V0T3B0aW9ucz4kYXR0cnMucGlwU2hvcmN1dE9wdGlvbnMgOiA8U2hvcnRjdXRPcHRpb25zPnt9O1xyXG4gICAgICAgIHRoaXMub3B0aW9ucy5UYXJnZXQgPSAkZWxlbWVudDtcclxuICAgICAgICBcclxuICAgICAgICAvLyBSZWdpc3RyYXRpb24gb2Yga2V5Ym9yZCBzaG9ydGN1dHNcclxuICAgICAgICBwaXBTaG9ydGN1dEJpbmRpbmcuYWRkKHRoaXMubmFtZVNob3J0Y3V0cywgKGU/OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMoJHNjb3BlLCB7JGV2ZW50OiB7J2UnOiBlfX0pOyAgICAgICAgICBcclxuICAgICAgICB9LCB0aGlzLm9wdGlvbnMpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUga2V5cHJlc3NTaG9ydGN1dChhY3Rpb24pIHtcclxuICAgICAgICB0aGlzLmFjdGlvblNob3J0Y3V0cygpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBQcmV2ZW50IGp1bmsgZnJvbSBnb2luZyBpbnRvIHR5cGVzY3JpcHQgZGVmaW5pdGlvbnNcclxue1xyXG4gICAgY29uc3Qgc2hvcnRjdXRzRGlyZWN0aXZlID0gZnVuY3Rpb24oKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLCAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiBTaG9ydGN1dENvbnRyb2xsZXJcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcFNob3J0Y3V0Jywgc2hvcnRjdXRzRGlyZWN0aXZlKTtcclxufSIsImltcG9ydCB7IElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlIH0gZnJvbSBcIi4vSVNob3J0Y3V0QmluZGluZ1NlcnZpY2VcIlxyXG5pbXBvcnQgeyBTaG9ydGN1dCwgU2hvcnRjdXRPcHRpb25zLCBLZXlib2FyZEV2ZW50IH0gZnJvbSBcIi4vU2hvcnRjdXRcIjtcclxuaW1wb3J0IHsgU2hvcnRjdXRzQ29uZmlnLCBTaG9ydGN1dEl0ZW0sIElTaG9ydGN1dHNTZXJ2aWNlLCBJU2hvcnRjdXRzUHJvdmlkZXIgfSBmcm9tICcuL0lTaG9ydGN1dHNTZXJ2aWNlJztcclxuXHJcbmV4cG9ydCBsZXQgU2hvcnRjdXRzQ2hhbmdlZEV2ZW50ID0gJ3BpcFNob3J0Y3V0c0NoYW5nZWQnO1xyXG5cclxuY2xhc3MgU2hvcnRjdXRzU2VydmljZSBpbXBsZW1lbnRzIElTaG9ydGN1dHNTZXJ2aWNlIHtcclxuICAgIHByaXZhdGUgX29sZENvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG4gICAgcHJpdmF0ZSBfY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcblxyXG4gICAgcHVibGljIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIGNvbmZpZzogU2hvcnRjdXRzQ29uZmlnLFxyXG4gICAgICAgIHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSwgXHJcbiAgICAgICAgcHJpdmF0ZSAkbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2UsIFxyXG4gICAgICAgIHByaXZhdGUgJGluamVjdG9yOiBuZy5hdXRvLklJbmplY3RvclNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSBwaXBTaG9ydGN1dEJpbmRpbmc6IElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICB0aGlzLl9jb25maWcgPSBjb25maWc7XHJcbiAgICAgICAgdGhpcy5fb2xkQ29uZmlnID0gXy5jbG9uZURlZXAodGhpcy5fY29uZmlnKTtcclxuXHJcbiAgICAgICAgLy8gQWRkIHNob3J0Y3V0c1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuX2NvbmZpZy5sb2NhbFNob3J0Y3V0cyk7ICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICAvLyBEZXNjcmliZSBwcml2YXRlIGZ1bmN0aW9uc1xyXG4gICAgcHJpdmF0ZSBzZW5kQ2hhbmdlRXZlbnQoKSB7XHJcbiAgICAgICAgLy8gUmVtb3ZlIHNob3J0Y3V0c1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2hvcnRjdXRzKHRoaXMuX29sZENvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMucmVtb3ZlU2hvcnRjdXRzKHRoaXMuX29sZENvbmZpZy5sb2NhbFNob3J0Y3V0cyk7XHJcblxyXG4gICAgICAgIC8vIEFkZCBzaG9ydGN1dHNcclxuICAgICAgICB0aGlzLmFkZFNob3J0Y3V0cyh0aGlzLmNvbmZpZy5nbG9iYWxTaG9ydGN1dHMpO1xyXG4gICAgICAgIHRoaXMuYWRkU2hvcnRjdXRzKHRoaXMuY29uZmlnLmxvY2FsU2hvcnRjdXRzKTtcclxuXHJcbiAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRlbWl0KFNob3J0Y3V0c0NoYW5nZWRFdmVudCwgdGhpcy5jb25maWcpO1xyXG5cclxuICAgICAgICAvLyBTYXZlIGN1cnJlbnQgY29uZmlnIHRvIG9sZENvbmZpZ1xyXG4gICAgICAgIHRoaXMuX29sZENvbmZpZyA9IF8uY2xvbmVEZWVwKHRoaXMuY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbW92ZVNob3J0Y3V0cyhjb2xsZWN0aW9uOiBTaG9ydGN1dEl0ZW1bXSk6IHZvaWQge1xyXG4gICAgICAgIF8uZWFjaChjb2xsZWN0aW9uLCAoaykgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBpcFNob3J0Y3V0QmluZGluZy5yZW1vdmUoay5zaG9ydGN1dCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBrZXlwcmVzc1Nob3J0Y3V0KGl0ZW06IFNob3J0Y3V0SXRlbSwgZXZlbnQ6IEpRdWVyeUV2ZW50T2JqZWN0KSB7XHJcbiAgICAgICAgaWYgKGl0ZW0uYWNjZXNzICYmIF8uaXNGdW5jdGlvbihpdGVtLmFjY2VzcykpIHtcclxuICAgICAgICAgICAgaWYgKCFpdGVtLmFjY2VzcyhldmVudCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gXHJcblxyXG4gICAgICAgIGlmIChpdGVtLmtleXByZXNzKSB7XHJcbiAgICAgICAgICAgIGl0ZW0ua2V5cHJlc3MoZXZlbnQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlbS5ocmVmKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gaXRlbS5ocmVmO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlbS51cmwpIHtcclxuICAgICAgICAgICAgdGhpcy4kbG9jYXRpb24udXJsKGl0ZW0udXJsKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZW0uc3RhdGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJGluamVjdG9yLmhhcygnJHN0YXRlJykpIHtcclxuICAgICAgICAgICAgICAgIHZhciAkc3RhdGUgPSB0aGlzLiRpbmplY3Rvci5nZXQoJyRzdGF0ZScpO1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlWydnbyddKGl0ZW0uc3RhdGUsIGl0ZW0uc3RhdGVQYXJhbXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVtLmV2ZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KGl0ZW0uZXZlbnQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSByYWlzZSBub3RpZmljYXRpb25cclxuICAgICAgICAgICAgdGhpcy4kcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3BpcFNob3J0Y3V0S2V5cHJlc3MnLCBpdGVtLnNob3J0Y3V0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhZGRTaG9ydGN1dHMoY29sbGVjdGlvbjogU2hvcnRjdXRJdGVtW10pOiB2b2lkIHtcclxuICAgICAgICBsZXQgZ2VuZXJhbE9wdGlvbnM6IFNob3J0Y3V0T3B0aW9ucyA9IHRoaXMuY29uZmlnLmRlZmF1bHRPcHRpb25zID8gdGhpcy5jb25maWcuZGVmYXVsdE9wdGlvbnMgOiA8U2hvcnRjdXRPcHRpb25zPnt9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIF8uZWFjaChjb2xsZWN0aW9uLCAoaykgPT4ge1xyXG4gICAgICAgICAgICBsZXQgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMgPSBrLm9wdGlvbnMgPyBrLm9wdGlvbnMgOiBnZW5lcmFsT3B0aW9ucztcclxuICAgICAgICAgICAgbGV0IHRhcmdldDogYW55O1xyXG5cclxuICAgICAgICAgICAgdGFyZ2V0ID0gay50YXJnZXQgPyBrLnRhcmdldCA6IGsudGFyZ2V0SWQ7XHJcbiAgICAgICAgICAgIG9wdGlvbi5UYXJnZXQgPSB0YXJnZXQ7XHJcbiAgICAgICAgICAgIC8vIFJlZ2lzdHJhdGlvbiBvZiBrZXlib2FyZCBzaG9ydGN1dFxyXG4gICAgICAgICAgICB0aGlzLnBpcFNob3J0Y3V0QmluZGluZy5hZGQoay5zaG9ydGN1dCwgKGU/OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMua2V5cHJlc3NTaG9ydGN1dChrLCBlKTsgICAgICAgIFxyXG4gICAgICAgICAgICB9LCBvcHRpb24pOyAgICAgICAgICAgICAgXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVzY3JpYmUgcHVibGljIGZ1bmN0aW9ucyBcclxuICAgIHB1YmxpYyBnZXQgY29uZmlnKCk6IFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGRlZmF1bHRPcHRpb25zKCk6IFNob3J0Y3V0T3B0aW9ucyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5kZWZhdWx0T3B0aW9ucztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGRlZmF1bHRPcHRpb25zKHZhbHVlOiBTaG9ydGN1dE9wdGlvbnMpIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnMgPSB2YWx1ZSB8fCBudWxsO1xyXG4gICAgICAgIHRoaXMuc2VuZENoYW5nZUV2ZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBnbG9iYWxTaG9ydGN1dHMoKTogU2hvcnRjdXRJdGVtW10ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgZ2xvYmFsU2hvcnRjdXRzKHZhbHVlOiBTaG9ydGN1dEl0ZW1bXSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMgPSB2YWx1ZSB8fCBbXTtcclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgbG9jYWxTaG9ydGN1dHMoKTogU2hvcnRjdXRJdGVtW10ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBsb2NhbFNob3J0Y3V0cyh2YWx1ZTogU2hvcnRjdXRJdGVtW10pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHMgPSB2YWx1ZSB8fCBbXTtcclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBTaG9ydGN1dHNQcm92aWRlciBpbXBsZW1lbnRzIElTaG9ydGN1dHNQcm92aWRlciB7XHJcbiAgICBwcml2YXRlIF9jb25maWc6IFNob3J0Y3V0c0NvbmZpZyA9IG5ldyBTaG9ydGN1dHNDb25maWcoKTtcclxuICAgIHByaXZhdGUgX3NlcnZpY2U6IFNob3J0Y3V0c1NlcnZpY2U7XHJcblxyXG4gICAgcHVibGljIGdldCBjb25maWcoKTogU2hvcnRjdXRzQ29uZmlnIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgY29uZmlnKHZhbHVlOiBTaG9ydGN1dHNDb25maWcpIHtcclxuICAgICAgICB0aGlzLl9jb25maWcgPSB2YWx1ZSB8fCBuZXcgU2hvcnRjdXRzQ29uZmlnKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBkZWZhdWx0T3B0aW9ucygpOiBTaG9ydGN1dE9wdGlvbnMge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBkZWZhdWx0T3B0aW9ucyh2YWx1ZTogU2hvcnRjdXRPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmRlZmF1bHRPcHRpb25zID0gdmFsdWUgfHwgbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGdsb2JhbFNob3J0Y3V0cygpOiBTaG9ydGN1dEl0ZW1bXSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBnbG9iYWxTaG9ydGN1dHModmFsdWU6IFNob3J0Y3V0SXRlbVtdKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cyA9IHZhbHVlIHx8IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyAkZ2V0KFxyXG4gICAgICAgICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLCBcclxuICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSwgXHJcbiAgICAgICAgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLCBcclxuICAgICAgICAkaW5qZWN0b3I6IG5nLmF1dG8uSUluamVjdG9yU2VydmljZSxcclxuICAgICAgICBwaXBTaG9ydGN1dEJpbmRpbmc6IElTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9zZXJ2aWNlID09IG51bGwpXHJcbiAgICAgICAgICAgIHRoaXMuX3NlcnZpY2UgPSBuZXcgU2hvcnRjdXRzU2VydmljZSh0aGlzLl9jb25maWcsICRyb290U2NvcGUsICR3aW5kb3csICRsb2NhdGlvbiwgJGluamVjdG9yLCBwaXBTaG9ydGN1dEJpbmRpbmcpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9zZXJ2aWNlO1xyXG4gICAgfVxyXG59XHJcblxyXG5hbmd1bGFyXHJcbiAgICAubW9kdWxlKCdwaXBTaG9ydGN1dHMnKVxyXG4gICAgLnByb3ZpZGVyKCdwaXBTaG9ydGN1dHMnLCBTaG9ydGN1dHNQcm92aWRlcik7XHJcblxyXG4iLCJhbmd1bGFyLm1vZHVsZSgncGlwU2hvcnRjdXRzJywgWyduZ01hdGVyaWFsJywgJ3VpLnJvdXRlciddKTtcclxuXHJcbmltcG9ydCAnLi9TaG9ydGN1dEJpbmRpbmdTZXJ2aWNlJztcclxuaW1wb3J0ICcuL1Nob3J0Y3V0c1NlcnZpY2UnO1xyXG5pbXBvcnQgJy4vU2hvcnRjdXREaXJlY3RpdmUnO1xyXG5cclxuZXhwb3J0ICogZnJvbSAnLi9JU2hvcnRjdXRzU2VydmljZSc7XHJcbmV4cG9ydCAqIGZyb20gJy4vSVNob3J0Y3V0QmluZGluZ1NlcnZpY2UnO1xyXG5leHBvcnQgKiBmcm9tICcuL1Nob3J0Y3V0c1NlcnZpY2UnO1xyXG5leHBvcnQgKiBmcm9tICcuL1Nob3J0Y3V0QmluZGluZ1NlcnZpY2UnOyIsIntcclxuICAgIGludGVyZmFjZSBVbnNhdmVkQ2hhbmdlc1Njb3BlIGV4dGVuZHMgbmcuSVNjb3BlIHtcclxuICAgICAgICB1bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZTogRnVuY3Rpb247XHJcbiAgICAgICAgdW5zYXZlZENoYW5nZXNNZXNzYWdlOiBzdHJpbmc7XHJcbiAgICAgICAgY2FuY2VsTGVhdmU6IEZ1bmN0aW9uO1xyXG4gICAgICAgIGFmdGVyTGVhdmU6IEZ1bmN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIFVuc2F2ZWRDaGFuZ2VzTGluayB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgICRzY29wZTogVW5zYXZlZENoYW5nZXNTY29wZSxcclxuICAgICAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgJHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUudW5zYXZlZENoYW5nZXNBdmFpbGFibGUoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgdW5iaW5kRnVuYyA9ICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlKCkgJiYgISR3aW5kb3cuY29uZmlybSgkc2NvcGUudW5zYXZlZENoYW5nZXNNZXNzYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbigkc2NvcGUuY2FuY2VsTGVhdmUpICYmICRzY29wZS5jYW5jZWxMZWF2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbigkc2NvcGUuYWZ0ZXJMZWF2ZSkgJiYgJHNjb3BlLmFmdGVyTGVhdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICR3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdW5iaW5kRnVuYygpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgVW5zYXZlZENoYW5nZXMgPSBmdW5jdGlvbiAoJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0FFJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlJyxcclxuICAgICAgICAgICAgICAgIHVuc2F2ZWRDaGFuZ2VzTWVzc2FnZTogJ0BwaXBVbnNhdmVkQ2hhbmdlc01lc3NhZ2UnLFxyXG4gICAgICAgICAgICAgICAgYWZ0ZXJMZWF2ZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0FmdGVyTGVhdmUnLFxyXG4gICAgICAgICAgICAgICAgY2FuY2VsTGVhdmU6ICcmcGlwVW5zYXZlZENoYW5nZXNDYW5jZWxMZWF2ZSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKCRzY29wZTogVW5zYXZlZENoYW5nZXNTY29wZSkge1xyXG4gICAgICAgICAgICAgICAgbmV3IFVuc2F2ZWRDaGFuZ2VzTGluaygkc2NvcGUsICR3aW5kb3cpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcInBpcFVuc2F2ZWRDaGFuZ2VzXCIsIFtdKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoXCJwaXBVbnNhdmVkQ2hhbmdlc1wiLCBVbnNhdmVkQ2hhbmdlcyk7XHJcbn0iXX0=