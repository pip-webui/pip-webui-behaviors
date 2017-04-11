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
{
    var ShortcutBindingService_1 = (function () {
        ShortcutBindingService_1.$inject = ['$log', 'option'];
        function ShortcutBindingService_1($log, option) {
            "ngInject";
            this._shortcuts = {};
            this._log = $log;
            this._defaultOption = option ? _.defaults(option, this.getDefaultOption()) : this.getDefaultOption();
        }
        ShortcutBindingService_1.prototype.getDefaultOption = function () {
            var defaultOption = {
                Type: Shortcut_1.KeyboardEvent.Keydown,
                Propagate: false,
                DisableInInput: false,
                Target: document,
                Keycode: null
            };
            return defaultOption;
        };
        Object.defineProperty(ShortcutBindingService_1.prototype, "shortcuts", {
            get: function () {
                return this._shortcuts;
            },
            enumerable: true,
            configurable: true
        });
        ShortcutBindingService_1.prototype.add = function (shortcut, callback, option) {
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
        ShortcutBindingService_1.prototype.remove = function (shorcut) {
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
        return ShortcutBindingService_1;
    }());
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
                this._service = new ShortcutBindingService_1($log, this._option);
            return this._service;
        }];
        return ShortcutBindingProvider;
    }());
    angular
        .module('pipShortcuts')
        .provider('pipShortcutBinding', ShortcutBindingProvider);
}
},{"./Shortcut":12}],14:[function(require,module,exports){
"use strict";
var ShortcutController = (function () {
    ShortcutController.$inject = ['$element', '$attrs', '$scope', '$log', '$parse', 'pipShortcutBinding'];
    function ShortcutController($element, $attrs, $scope, $log, $parse, pipShortcutBinding) {
        "ngInject";
        var _this = this;
        if ($attrs.pipShortcutAction) {
            this.actionShortcuts = $parse($attrs.pipShortcutAction);
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
            if (target) {
                option.Target = target;
            }
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZHJhZ2dhYmxlL0NhbmNlbERyYWcudHMiLCJzcmMvZHJhZ2dhYmxlL0RyYWcudHMiLCJzcmMvZHJhZ2dhYmxlL0RyYWdnYWJsZVNlcnZpY2UudHMiLCJzcmMvZHJhZ2dhYmxlL0Ryb3AudHMiLCJzcmMvZHJhZ2dhYmxlL1ByZXZlbnREcmFnLnRzIiwic3JjL2RyYWdnYWJsZS9pbmRleC50cyIsInNyYy9mb2N1c2VkL2ZvY3VzZWQudHMiLCJzcmMvaW5kZXgudHMiLCJzcmMvaW5maW5pdGVfc2Nyb2xsL2luZmluaXRlU2Nyb2xsLnRzIiwic3JjL3NlbGVjdGVkL3NlbGVjdGVkLnRzIiwic3JjL3Nob3J0Y3V0cy9JU2hvcnRjdXRzU2VydmljZS50cyIsInNyYy9zaG9ydGN1dHMvU2hvcnRjdXQudHMiLCJzcmMvc2hvcnRjdXRzL1Nob3J0Y3V0QmluZGluZ1NlcnZpY2UudHMiLCJzcmMvc2hvcnRjdXRzL1Nob3J0Y3V0RGlyZWN0aXZlLnRzIiwic3JjL3Nob3J0Y3V0cy9TaG9ydGN1dHNTZXJ2aWNlLnRzIiwic3JjL3Nob3J0Y3V0cy9pbmRleC50cyIsInNyYy91bnNhdmVkX2NoYW5nZXMvdW5zYXZlZENoYW5nZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxDQUFDO0lBQ0c7UUFDSSwwQkFDSSxRQUFnQjtZQUVoQixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFDTCx1QkFBQztJQUFELENBTkEsQUFNQyxJQUFBO0lBRUQsSUFBTSxVQUFVLEdBQUc7UUFDZixNQUFNLENBQUM7WUFDSCxRQUFRLEVBQUUsR0FBRztZQUNiLElBQUksRUFBRSxVQUNGLE1BQWlCLEVBQ2pCLFFBQWdCLEVBQ2hCLE1BQXNCO2dCQUV0QixJQUFJLGdCQUFjLENBQUMs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Q0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUMzRCxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRTtnQkFDbkIsT0FBTyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7Z0JBQzlCLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztRQUNMLDJCQUFDO0lBQUQsQ0F6QkEsQUF5QkMsSUFBQTtJQUVELElBQU0sY0FBYyxHQUFHLFVBQVUsT0FBMEI7UUFDdkQsTUFBTSxDQUFDO1lBQ0gsUUFBUSxFQUFFLElBQUk7WUFDZCxLQUFLLEVBQUU7Z0JBQ0gsdUJBQXVCLEVBQUUsNkJBQTZCO2dCQUN0RCxxQkFBcUIsRUFBRSwyQkFBMkI7Z0JBQ2xELFVBQVUsRUFBRSw4QkFBOEI7Z0JBQzFDLFdBQVcsRUFBRSwrQkFBK0I7YUFDL0M7WUFDRCxJQUFJLEVBQUUsVUFBVSxNQUEyQjtnQkFDdkMsSUFBSSxvQkFBa0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDNUMsQ0FBQztTQUNKLENBQUM7SUFDTixDQUFDLENBQUE7SUFFRCxPQUFPO1NBQ0YsTUFBTSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztTQUMvQixTQUFTLENBQUMsbUJBQW1CLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDeEQsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ7XHJcbiAgICBjbGFzcyBDYW5jZWxEcmFnTGluayB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgICRlbGVtZW50OiBKUXVlcnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgJGVsZW1lbnQuZmluZCgnKicpLmF0dHIoJ3BpcC1jYW5jZWwtZHJhZycsICdwaXAtY2FuY2VsLWRyYWcnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgQ2FuY2VsRHJhZyA9IGZ1bmN0aW9uICgpOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoXHJcbiAgICAgICAgICAgICAgICAkc2NvcGU6IG5nLklTY29wZSxcclxuICAgICAgICAgICAgICAgICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgICAgICAkYXR0cnM6IG5nLklBdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgbmV3IENhbmNlbERyYWdMaW5rKCRlbGVtZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcInBpcERyYWdnYWJsZVwiKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcENhbmNlbERyYWcnLCBDYW5jZWxEcmFnKTtcclxufSIsImltcG9ydCB7IElEcmFnZ2FibGVTZXJ2aWNlIH0gZnJvbSAnLi9EcmFnZ2FibGVTZXJ2aWNlJztcclxuXHJcbntcclxuICAgIGludGVyZmFjZSBJRHJhZ0xpbmtTY29wZSBleHRlbmRzIG5nLklTY29wZSB7XHJcbiAgICAgICAgdmFsdWU6IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgSURyYWdMaW5rQXR0cmlidXRlcyBleHRlbmRzIG5nLklBdHRyaWJ1dGVzIHtcclxuICAgICAgICBuZ0RyYWc6IGFueTtcclxuICAgICAgICBwaXBEcmFnU3RhcnQ6IGFueTtcclxuICAgICAgICBwaXBEcmFnU3RvcDogYW55O1xyXG4gICAgICAgIHBpcERyYWdTdWNjZXNzOiBhbnk7XHJcbiAgICAgICAgYWxsb3dUcmFuc2Zvcm06IGFueTtcclxuICAgICAgICBwaXBEcmFnRGF0YTogYW55O1xyXG4gICAgICAgIHBpcFZlcnRpY2FsU2Nyb2xsOiBhbnk7XHJcbiAgICAgICAgcGlwSG9yaXpvbnRhbFNjcm9sbDogYW55O1xyXG4gICAgICAgIHBpcEFjdGl2YXRpb25EaXN0YW5jZTogYW55O1xyXG4gICAgICAgIHBpcFNjcm9sbENvbnRhaW5lcjogYW55O1xyXG4gICAgICAgIHBpcERyYWc6IGFueTtcclxuICAgICAgICBwaXBDZW50ZXJBbmNob3I6IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBEcmFnTGluayB7XHJcbiAgICAgICAgcHJpdmF0ZSBMT05HX1BSRVNTOiBudW1iZXIgPSA1MDsgLy8gNTBtcyBmb3IgbG9uZ3ByZXNzXHJcbiAgICAgICAgcHJpdmF0ZSBvZmZzZXQ6IGFueTtcclxuICAgICAgICBwcml2YXRlIF9jZW50ZXJBbmNob3I6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBwcml2YXRlIF9teDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX215OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBfdHg6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIF90eTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX21yeDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX21yeTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgX2hhc1RvdWNoOiBib29sZWFuID0gKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdykgfHwgKCA8IGFueSA+IHdpbmRvdykuRG9jdW1lbnRUb3VjaDsgLy8gJiYgZG9jdW1lbnQgaW5zdGFuY2VvZiBEb2N1bWVudFRvdWNoOyAvLyBEb2N1bWVudFRvdWNoIGlzIG5vdCBkZWZpbmVkIVxyXG4gICAgICAgIHByaXZhdGUgX3ByZXNzRXZlbnRzOiBzdHJpbmcgPSAndG91Y2hzdGFydCBtb3VzZWRvd24nO1xyXG4gICAgICAgIHByaXZhdGUgX21vdmVFdmVudHM6IHN0cmluZyA9ICd0b3VjaG1vdmUgbW91c2Vtb3ZlJztcclxuICAgICAgICBwcml2YXRlIF9yZWxlYXNlRXZlbnRzOiBzdHJpbmcgPSAndG91Y2hlbmQgbW91c2V1cCc7XHJcbiAgICAgICAgcHJpdmF0ZSBfZHJhZ0hhbmRsZTogYW55O1xyXG5cclxuICAgICAgICAvLyB0byBpZGVudGlmeSB0aGUgZWxlbWVudCBpbiBvcmRlciB0byBwcmV2ZW50IGdldHRpbmcgc3VwZXJmbG91cyBldmVudHMgd2hlbiBhIHNpbmdsZSBlbGVtZW50IGhhcyBib3RoIGRyYWcgYW5kIGRyb3AgZGlyZWN0aXZlcyBvbiBpdC5cclxuICAgICAgICBwcml2YXRlIF9teWlkOiBzdHJpbmcgfCBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBfZGF0YTogYW55ID0gbnVsbDtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfZHJhZ09mZnNldDogYW55ID0gbnVsbDtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfZHJhZ0VuYWJsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfcHJlc3NUaW1lcjogYW55ID0gbnVsbDtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBfZWxlbWVudFN0eWxlOiBhbnkgPSB7fTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdTdGFydENhbGxiYWNrOiBGdW5jdGlvbjtcclxuICAgICAgICBwcml2YXRlIG9uRHJhZ1N0b3BDYWxsYmFjazogRnVuY3Rpb247XHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdTdWNjZXNzQ2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHByaXZhdGUgYWxsb3dUcmFuc2Zvcm06IGJvb2xlYW47XHJcblxyXG4gICAgICAgIHByaXZhdGUgZ2V0RHJhZ0RhdGE6IGFueTtcclxuICAgICAgICBwcml2YXRlIHZlcnRpY2FsU2Nyb2xsOiBib29sZWFuO1xyXG4gICAgICAgIHByaXZhdGUgaG9yaXpvbnRhbFNjcm9sbDogYm9vbGVhbjtcclxuICAgICAgICBwcml2YXRlIGFjdGl2YXRpb25EaXN0YW5jZTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgc2Nyb2xsRGlzdGFuY2U6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIHNjcm9sbFBhcmVudDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBwcml2YXRlIHNjcm9sbENvbnRhaW5lcjogSlF1ZXJ5ID0gYW5ndWxhci5lbGVtZW50KHdpbmRvdyk7XHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxDb250YWluZXJHZXR0ZXI6IGFueTtcclxuXHJcbiAgICAgICAgLy8gZGVyZWdpc3RyYXRpb24gZnVuY3Rpb24gZm9yIG1vdXNlIG1vdmUgZXZlbnRzIGluICRyb290U2NvcGUgdHJpZ2dlcmVkIGJ5IGpxTGl0ZSB0cmlnZ2VyIGhhbmRsZXJcclxuICAgICAgICBwcml2YXRlIF9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lcjogRnVuY3Rpb24gPSBhbmd1bGFyLm5vb3A7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRwYXJzZTogbmcuSVBhcnNlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZG9jdW1lbnQ6IG5nLklEb2N1bWVudFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgcGlwRHJhZ2dhYmxlOiBJRHJhZ2dhYmxlU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IElEcmFnTGlua1Njb3BlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGF0dHJzOiBJRHJhZ0xpbmtBdHRyaWJ1dGVzXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICRzY29wZS52YWx1ZSA9ICRhdHRycy5uZ0RyYWc7XHJcbiAgICAgICAgICAgIHRoaXMuX215aWQgPSAkc2NvcGUuJGlkO1xyXG4gICAgICAgICAgICB0aGlzLm9uRHJhZ1N0YXJ0Q2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdTdGFydCkgfHwgbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5vbkRyYWdTdG9wQ2FsbGJhY2sgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdTdG9wKSB8fCBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLm9uRHJhZ1N1Y2Nlc3NDYWxsYmFjayA9ICRwYXJzZSgkYXR0cnMucGlwRHJhZ1N1Y2Nlc3MpIHx8IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuYWxsb3dUcmFuc2Zvcm0gPSBhbmd1bGFyLmlzRGVmaW5lZCgkYXR0cnMuYWxsb3dUcmFuc2Zvcm0pID8gJHNjb3BlLiRldmFsKCRhdHRycy5hbGxvd1RyYW5zZm9ybSkgOiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0RHJhZ0RhdGEgPSAkcGFyc2UoJGF0dHJzLnBpcERyYWdEYXRhKTtcclxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNhbFNjcm9sbCA9ICRhdHRycy5waXBWZXJ0aWNhbFNjcm9sbCB8fCB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmhvcml6b250YWxTY3JvbGwgPSAkYXR0cnMucGlwSG9yaXpvbnRhbFNjcm9sbCB8fCB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRpb25EaXN0YW5jZSA9IHBhcnNlRmxvYXQoJGF0dHJzLnBpcEFjdGl2YXRpb25EaXN0YW5jZSkgfHwgNzU7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsRGlzdGFuY2UgPSBwYXJzZUZsb2F0KCRhdHRycy5waXBBY3RpdmF0aW9uRGlzdGFuY2UpIHx8IDUwO1xyXG4gICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lckdldHRlciA9ICRwYXJzZSgkYXR0cnMucGlwU2Nyb2xsQ29udGFpbmVyKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKCdjdXJzb3InLCAnbW92ZScpO1xyXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdwaXAtZHJhZ2dhYmxlJywgJ2ZhbHNlJyk7IC8vIHByZXZlbnQgbmF0aXZlIGRyYWdcclxuICAgICAgICAgICAgLy8gY2hlY2sgdG8gc2VlIGlmIGRyYWcgaGFuZGxlKHMpIHdhcyBzcGVjaWZpZWRcclxuICAgICAgICAgICAgLy8gaWYgcXVlcnlTZWxlY3RvckFsbCBpcyBhdmFpbGFibGUsIHdlIHVzZSB0aGlzIGluc3RlYWQgb2YgZmluZFxyXG4gICAgICAgICAgICAvLyBhcyBKUUxpdGUgZmluZCBpcyBsaW1pdGVkIHRvIHRhZ25hbWVzXHJcbiAgICAgICAgICAgIGxldCBkcmFnSGFuZGxlczogYW55O1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kZWxlbWVudFswXS5xdWVyeVNlbGVjdG9yQWxsKSB7XHJcbiAgICAgICAgICAgICAgICBkcmFnSGFuZGxlcyA9IGFuZ3VsYXIuZWxlbWVudCh0aGlzLiRlbGVtZW50WzBdLnF1ZXJ5U2VsZWN0b3JBbGwoJ1twaXAtZHJhZy1oYW5kbGVdJykpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZHJhZ0hhbmRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1twaXAtZHJhZy1oYW5kbGVdJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRyYWdIYW5kbGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZHJhZ0hhbmRsZSA9IGRyYWdIYW5kbGVzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMudG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY3JvbGwgY29udGFpbmVyXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbFBhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQodGhpcy4kZWxlbWVudC5wYXJlbnQoKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy4kYXR0cnMucGlwU2Nyb2xsQ29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudCh0aGlzLnNjcm9sbENvbnRhaW5lckdldHRlcih0aGlzLiRzY29wZSkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIgPSBhbmd1bGFyLmVsZW1lbnQod2luZG93KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgIGlmICghZW5hYmxlKSByZXR1cm47XHJcbiAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcblxyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJyRkZXN0cm95JywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkRlc3Ryb3koZW5hYmxlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJHNjb3BlLiR3YXRjaCh0aGlzLiRhdHRycy5waXBEcmFnLCAobmV3VmFsLCBvbGRWYWwpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJHdhdGNoKHRoaXMuJGF0dHJzLnBpcENlbnRlckFuY2hvciwgKG5ld1ZhbCwgb2xkVmFsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2VudGVyQW5jaG9yKG5ld1ZhbCwgb2xkVmFsKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIHdpcmUgdXAgdG91Y2ggZXZlbnRzXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9kcmFnSGFuZGxlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBoYW5kbGUocykgc3BlY2lmaWVkLCB1c2UgdGhvc2UgdG8gaW5pdGlhdGUgZHJhZ1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZHJhZ0hhbmRsZS5vbih0aGlzLl9wcmVzc0V2ZW50cywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbnByZXNzKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gbm8gaGFuZGxlKHMpIHNwZWNpZmllZCwgdXNlIHRoZSBlbGVtZW50IGFzIHRoZSBoYW5kbGVcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQub24odGhpcy5fcHJlc3NFdmVudHMsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25wcmVzcyhldmVudCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2hhc1RvdWNoICYmIHRoaXMuJGVsZW1lbnRbMF0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSBcImltZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24nLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSk7IC8vIHByZXZlbnQgbmF0aXZlIGRyYWcgZm9yIGltYWdlc1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRGVzdHJveShlbmFibGUpIHtcclxuICAgICAgICAgICAgdGhpcy50b2dnbGVMaXN0ZW5lcnMoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkVuYWJsZUNoYW5nZShuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICB0aGlzLl9kcmFnRW5hYmxlZCA9IChuZXdWYWwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkNlbnRlckFuY2hvcihuZXdWYWwsIG9sZFZhbCkge1xyXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQobmV3VmFsKSlcclxuICAgICAgICAgICAgICAgIHRoaXMuX2NlbnRlckFuY2hvciA9IChuZXdWYWwgfHwgJ3RydWUnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaXNDbGlja2FibGVFbGVtZW50KGV2dCkge1xyXG4gICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgYW5ndWxhci5pc0RlZmluZWQoYW5ndWxhci5lbGVtZW50KGV2dC50YXJnZXQpLmF0dHIoXCJwaXAtY2FuY2VsLWRyYWdcIikpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgICAqIFdoZW4gdGhlIGVsZW1lbnQgaXMgY2xpY2tlZCBzdGFydCB0aGUgZHJhZyBiZWhhdmlvdXJcclxuICAgICAgICAgKiBPbiB0b3VjaCBkZXZpY2VzIGFzIGEgc21hbGwgZGVsYXkgc28gYXMgbm90IHRvIHByZXZlbnQgbmF0aXZlIHdpbmRvdyBzY3JvbGxpbmdcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIG9ucHJlc3MoZXZ0KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJhZ0VuYWJsZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQ2xpY2thYmxlRWxlbWVudChldnQpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChldnQudHlwZSA9PSBcIm1vdXNlZG93blwiICYmIGV2dC5idXR0b24gIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8gRG8gbm90IHN0YXJ0IGRyYWdnaW5nIG9uIHJpZ2h0LWNsaWNrXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2F2ZUVsZW1lbnRTdHlsZXMoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9oYXNUb3VjaCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxQcmVzcygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fcHJlc3NUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9ubG9uZ3ByZXNzKGV2dCk7XHJcbiAgICAgICAgICAgICAgICB9LCB0aGlzLkxPTkdfUFJFU1MpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub24odGhpcy5fbW92ZUV2ZW50cywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub24odGhpcy5fcmVsZWFzZUV2ZW50cywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbmxvbmdwcmVzcyhldnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHNhdmVFbGVtZW50U3R5bGVzKCkge1xyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50U3R5bGUubGVmdCA9IHRoaXMuJGVsZW1lbnQuY3NzKCdjc3MnKSB8fCAwO1xyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50U3R5bGUudG9wID0gdGhpcy4kZWxlbWVudC5jc3MoJ3RvcCcpIHx8IDA7XHJcbiAgICAgICAgICAgIHRoaXMuX2VsZW1lbnRTdHlsZS5wb3NpdGlvbiA9IHRoaXMuJGVsZW1lbnQuY3NzKCdwb3NpdGlvbicpO1xyXG4gICAgICAgICAgICB0aGlzLl9lbGVtZW50U3R5bGUud2lkdGggPSB0aGlzLiRlbGVtZW50LmNzcygnd2lkdGgnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY2FuY2VsUHJlc3MoKSB7XHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9wcmVzc1RpbWVyKTtcclxuICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub2ZmKHRoaXMuX21vdmVFdmVudHMsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsUHJlc3MoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuJGRvY3VtZW50Lm9mZih0aGlzLl9yZWxlYXNlRXZlbnRzLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbFByZXNzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbmxvbmdwcmVzcyhldnQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9kcmFnRW5hYmxlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0ID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYWxsb3dUcmFuc2Zvcm0pXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9kcmFnT2Zmc2V0ID0gdGhpcy5vZmZzZXQ7XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZHJhZ09mZnNldCA9IHtcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9wOiBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICggPCBhbnkgPiB0aGlzLiRlbGVtZW50KS5jZW50ZXJYID0gdGhpcy4kZWxlbWVudFswXS5vZmZzZXRXaWR0aCAvIDI7XHJcbiAgICAgICAgICAgICggPCBhbnkgPiB0aGlzLiRlbGVtZW50KS5jZW50ZXJZID0gdGhpcy4kZWxlbWVudFswXS5vZmZzZXRIZWlnaHQgLyAyO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5fbXggPSB0aGlzLnBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVg7XHJcbiAgICAgICAgICAgIHRoaXMuX215ID0gdGhpcy5waXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VZO1xyXG4gICAgICAgICAgICB0aGlzLl9tcnggPSB0aGlzLl9teCAtIHRoaXMub2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgIHRoaXMuX21yeSA9IHRoaXMuX215IC0gdGhpcy5vZmZzZXQudG9wO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fY2VudGVyQW5jaG9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eCA9IHRoaXMuX214IC0gKCA8IGFueSA+IHRoaXMuJGVsZW1lbnQpLmNlbnRlclggLSB0aGlzLiR3aW5kb3cucGFnZVhPZmZzZXQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eSA9IHRoaXMuX215IC0gKCA8IGFueSA+IHRoaXMuJGVsZW1lbnQpLmNlbnRlclkgLSB0aGlzLiR3aW5kb3cucGFnZVlPZmZzZXQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eCA9IHRoaXMuX214IC0gdGhpcy5fbXJ4IC0gdGhpcy4kd2luZG93LnBhZ2VYT2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdHkgPSB0aGlzLl9teSAtIHRoaXMuX21yeSAtIHRoaXMuJHdpbmRvdy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub24odGhpcy5fbW92ZUV2ZW50cywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9ubW92ZShldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLiRkb2N1bWVudC5vbih0aGlzLl9yZWxlYXNlRXZlbnRzLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25yZWxlYXNlKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIFRoaXMgZXZlbnQgaXMgdXNlZCB0byByZWNlaXZlIG1hbnVhbGx5IHRyaWdnZXJlZCBtb3VzZSBtb3ZlIGV2ZW50c1xyXG4gICAgICAgICAgICAvLyBqcUxpdGUgdW5mb3J0dW5hdGVseSBvbmx5IHN1cHBvcnRzIHRyaWdnZXJIYW5kbGVyKC4uLilcclxuICAgICAgICAgICAgLy8gU2VlIGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS90cmlnZ2VySGFuZGxlci9cclxuICAgICAgICAgICAgLy8gX2RlcmVnaXN0ZXJSb290TW92ZUxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJ2RyYWdnYWJsZTpfdHJpZ2dlckhhbmRsZXJNb3ZlJywgb25tb3ZlKTtcclxuICAgICAgICAgICAgdGhpcy5fZGVyZWdpc3RlclJvb3RNb3ZlTGlzdGVuZXIgPSB0aGlzLiRyb290U2NvcGUuJG9uKCdkcmFnZ2FibGU6X3RyaWdnZXJIYW5kbGVyTW92ZScsIChldmVudCwgb3JpZ0V2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9ubW92ZShvcmlnRXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25tb3ZlKGV2dCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2RyYWdFbmFibGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ3BpcC1kcmFnZ2luZycpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9kYXRhID0gdGhpcy5nZXREcmFnRGF0YSh0aGlzLiRzY29wZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZ2dpbmcnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdkcmFnZ2FibGU6c3RhcnQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgeDogdGhpcy5fbXgsXHJcbiAgICAgICAgICAgICAgICAgICAgeTogdGhpcy5fbXksXHJcbiAgICAgICAgICAgICAgICAgICAgdHg6IHRoaXMuX3R4LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5OiB0aGlzLl90eSxcclxuICAgICAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IHRoaXMuJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogdGhpcy5fZGF0YVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub25EcmFnU3RhcnRDYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHNjb3BlLiRhcHBseSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25EcmFnU3RhcnRDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGE6IHRoaXMuX2RhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IGV2dFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5fbXggPSB0aGlzLnBpcERyYWdnYWJsZS5pbnB1dEV2ZW50KGV2dCkucGFnZVg7XHJcbiAgICAgICAgICAgIHRoaXMuX215ID0gdGhpcy5waXBEcmFnZ2FibGUuaW5wdXRFdmVudChldnQpLnBhZ2VZO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNjcm9sbCB8fCB0aGlzLnZlcnRpY2FsU2Nyb2xsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyYWdUb1Njcm9sbCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fY2VudGVyQW5jaG9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eCA9IHRoaXMuX214IC0gKCA8IGFueSA+IHRoaXMuJGVsZW1lbnQpLmNlbnRlclggLSB0aGlzLl9kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eSA9IHRoaXMuX215IC0gKCA8IGFueSA+IHRoaXMuJGVsZW1lbnQpLmNlbnRlclkgLSB0aGlzLl9kcmFnT2Zmc2V0LnRvcDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3R4ID0gdGhpcy5fbXggLSB0aGlzLl9tcnggLSB0aGlzLl9kcmFnT2Zmc2V0LmxlZnQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl90eSA9IHRoaXMuX215IC0gdGhpcy5fbXJ5IC0gdGhpcy5fZHJhZ09mZnNldC50b3A7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZUVsZW1lbnQodGhpcy5fdHgsIHRoaXMuX3R5KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdkcmFnZ2FibGU6bW92ZScsIHtcclxuICAgICAgICAgICAgICAgIHg6IHRoaXMuX214LFxyXG4gICAgICAgICAgICAgICAgeTogdGhpcy5fbXksXHJcbiAgICAgICAgICAgICAgICB0eDogdGhpcy5fdHgsXHJcbiAgICAgICAgICAgICAgICB0eTogdGhpcy5fdHksXHJcbiAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgZWxlbWVudDogdGhpcy4kZWxlbWVudCxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHRoaXMuX2RhdGEsXHJcbiAgICAgICAgICAgICAgICB1aWQ6IHRoaXMuX215aWQsXHJcbiAgICAgICAgICAgICAgICBkcmFnT2Zmc2V0OiB0aGlzLl9kcmFnT2Zmc2V0XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbnJlbGVhc2UoZXZ0KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJhZ0VuYWJsZWQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdCgnZHJhZ2dhYmxlOmVuZCcsIHtcclxuICAgICAgICAgICAgICAgIHg6IHRoaXMuX214LFxyXG4gICAgICAgICAgICAgICAgeTogdGhpcy5fbXksXHJcbiAgICAgICAgICAgICAgICB0eDogdGhpcy5fdHgsXHJcbiAgICAgICAgICAgICAgICB0eTogdGhpcy5fdHksXHJcbiAgICAgICAgICAgICAgICBldmVudDogZXZ0LFxyXG4gICAgICAgICAgICAgICAgZWxlbWVudDogdGhpcy4kZWxlbWVudCxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHRoaXMuX2RhdGEsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogdGhpcy5vbkRyYWdDb21wbGV0ZSxcclxuICAgICAgICAgICAgICAgIHVpZDogdGhpcy5fbXlpZFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWRyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQucGFyZW50KCkuZmluZCgnLnBpcC1kcmFnLWVudGVyJykucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnLWVudGVyJyk7XHJcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcclxuICAgICAgICAgICAgdGhpcy4kZG9jdW1lbnQub2ZmKHRoaXMuX21vdmVFdmVudHMpO1xyXG4gICAgICAgICAgICB0aGlzLiRkb2N1bWVudC5vZmYodGhpcy5fcmVsZWFzZUV2ZW50cyk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9uRHJhZ1N0b3BDYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuJGFwcGx5KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ1N0b3BDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZGF0YTogdGhpcy5fZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBldnRcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9kZXJlZ2lzdGVyUm9vdE1vdmVMaXN0ZW5lcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdDb21wbGV0ZShldnQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLm9uRHJhZ1N1Y2Nlc3NDYWxsYmFjaykgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJGFwcGx5KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25EcmFnU3VjY2Vzc0NhbGxiYWNrKHRoaXMuJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGRhdGE6IHRoaXMuX2RhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBldnRcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgcmVzZXQoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmFsbG93VHJhbnNmb3JtKVxyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAnLW1zLXRyYW5zZm9ybSc6ICcnXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMuX2VsZW1lbnRTdHlsZS5wb3NpdGlvbixcclxuICAgICAgICAgICAgICAgICAgICB0b3A6IHRoaXMuX2VsZW1lbnRTdHlsZS50b3AsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogdGhpcy5fZWxlbWVudFN0eWxlLmxlZnQsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogdGhpcy5fZWxlbWVudFN0eWxlLndpZHRoXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBtb3ZlRWxlbWVudCh4LCB5KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVXaWR0aCA9IHRoaXMuJGVsZW1lbnQuY3NzKCd3aWR0aCcpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5hbGxvd1RyYW5zZm9ybSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJ21hdHJpeDNkKDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsICcgKyB4ICsgJywgJyArIHkgKyAnLCAwLCAxKScsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3otaW5kZXgnOiA5OTk5OSxcclxuICAgICAgICAgICAgICAgICAgICAnLXdlYmtpdC10cmFuc2Zvcm0nOiAnbWF0cml4M2QoMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgJyArIHggKyAnLCAnICsgeSArICcsIDAsIDEpJyxcclxuICAgICAgICAgICAgICAgICAgICAnLW1zLXRyYW5zZm9ybSc6ICdtYXRyaXgoMSwgMCwgMCwgMSwgJyArIHggKyAnLCAnICsgeSArICcpJ1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmNzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgJ2xlZnQnOiB4ICsgJ3B4JyxcclxuICAgICAgICAgICAgICAgICAgICAndG9wJzogeSArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2ZpeGVkJyxcclxuICAgICAgICAgICAgICAgICAgICAnei1pbmRleCc6IDEwMCxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogZVdpZHRoXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBkcmFnVG9TY3JvbGwoKSB7XHJcbiAgICAgICAgICAgIGxldCBzY3JvbGxYID0gMCxcclxuICAgICAgICAgICAgICAgIHNjcm9sbFkgPSAwLFxyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ID0gKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5vZmZzZXQoKSB8fCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogMFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3RcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJMZWZ0ID0gb2Zmc2V0KHRoaXMuc2Nyb2xsQ29udGFpbmVyKS5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcldpZHRoID0gdGhpcy5zY3JvbGxDb250YWluZXIuaW5uZXJXaWR0aCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclJpZ2h0ID0gY29udGFpbmVyTGVmdCArIGNvbnRhaW5lcldpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICgodGhpcy5fbXggLSBjb250YWluZXJMZWZ0KSA8IHRoaXMuYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWCA9IC10aGlzLnNjcm9sbERpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgoY29udGFpbmVyUmlnaHQgLSB0aGlzLl9teCkgPCB0aGlzLmFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcm9sbFggPSB0aGlzLnNjcm9sbERpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy52ZXJ0aWNhbFNjcm9sbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3RcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJUb3AgPSBvZmZzZXQodGhpcy5zY3JvbGxDb250YWluZXIpLnRvcCxcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJIZWlnaHQgPSB0aGlzLnNjcm9sbENvbnRhaW5lci5pbm5lckhlaWdodCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IGNvbnRhaW5lclRvcCArIGNvbnRhaW5lckhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoKHRoaXMuX215IC0gY29udGFpbmVyVG9wKSA8IHRoaXMuYWN0aXZhdGlvbkRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWSA9IC10aGlzLnNjcm9sbERpc3RhbmNlICsgMzA7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKChjb250YWluZXJCb3R0b20gLSB0aGlzLl9teSkgPCB0aGlzLmFjdGl2YXRpb25EaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcm9sbFkgPSB0aGlzLnNjcm9sbERpc3RhbmNlIC0gMzA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHNjcm9sbFggIT09IDAgfHwgc2Nyb2xsWSAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3RcclxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJTY3JvbGxMZWZ0ID0gdGhpcy5zY3JvbGxDb250YWluZXIuc2Nyb2xsTGVmdCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclNjcm9sbFRvcCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyLnNjcm9sbFRvcCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyLnNjcm9sbExlZnQoY29udGFpbmVyU2Nyb2xsTGVmdCArIHNjcm9sbFgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxDb250YWluZXIuc2Nyb2xsVG9wKGNvbnRhaW5lclNjcm9sbFRvcCArIHNjcm9sbFkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgRHJhZyA9IGZ1bmN0aW9uIChcclxuICAgICAgICAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSxcclxuICAgICAgICAkcGFyc2U6IG5nLklQYXJzZVNlcnZpY2UsXHJcbiAgICAgICAgJGRvY3VtZW50OiBuZy5JRG9jdW1lbnRTZXJ2aWNlLFxyXG4gICAgICAgICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgIHBpcERyYWdnYWJsZTogSURyYWdnYWJsZVNlcnZpY2UsXHJcbiAgICApOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoXHJcbiAgICAgICAgICAgICAgICAkc2NvcGU6IElEcmFnTGlua1Njb3BlLFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgICAgICRhdHRyczogSURyYWdMaW5rQXR0cmlidXRlc1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIG5ldyBEcmFnTGluaygkcm9vdFNjb3BlLCAkcGFyc2UsICRkb2N1bWVudCwgJHdpbmRvdywgcGlwRHJhZ2dhYmxlLCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKFwicGlwRHJhZ2dhYmxlXCIpXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwRHJhZycsIERyYWcpO1xyXG59IiwiZXhwb3J0IGludGVyZmFjZSBJRHJhZ2dhYmxlU2VydmljZSB7XHJcbiAgICBpbnB1dEV2ZW50KGV2ZW50OiBhbnkpO1xyXG59XHJcblxyXG5jbGFzcyBEcmFnZ2FibGVTZXJ2aWNlIGltcGxlbWVudHMgSURyYWdnYWJsZVNlcnZpY2Uge1xyXG4gICAgcHVibGljIGlucHV0RXZlbnQoZXZlbnQpIHtcclxuICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoZXZlbnQudG91Y2hlcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnRvdWNoZXNbMF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vQ2hlY2tpbmcgYm90aCBpcyBub3QgcmVkdW5kZW50LiBJZiBvbmx5IGNoZWNrIGlmIHRvdWNoZXMgaXNEZWZpbmVkLCBhbmd1bGFyanMgaXNEZWZuaWVkIHdpbGwgcmV0dXJuIGVycm9yIGFuZCBzdG9wIHRoZSByZW1haW5pbmcgc2NyaXB0eSBpZiBldmVudC5vcmlnaW5hbEV2ZW50IGlzIG5vdCBkZWZpbmVkLlxyXG4gICAgICAgIGVsc2UgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50Lm9yaWdpbmFsRXZlbnQpICYmIGFuZ3VsYXIuaXNEZWZpbmVkKGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1swXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGV2ZW50O1xyXG4gICAgfTtcclxufVxyXG5cclxuYW5ndWxhclxyXG4gICAgLm1vZHVsZShcInBpcERyYWdnYWJsZVwiKVxyXG4gICAgLnNlcnZpY2UoJ3BpcERyYWdnYWJsZScsIERyYWdnYWJsZVNlcnZpY2UpO1xyXG4gICAgIiwiaW1wb3J0IHsgSURyYWdnYWJsZVNlcnZpY2UgfSBmcm9tICcuL0RyYWdnYWJsZVNlcnZpY2UnO1xyXG5cclxue1xyXG4gICAgaW50ZXJmYWNlIElEcm9wTGlua1Njb3BlIGV4dGVuZHMgbmcuSVNjb3BlIHtcclxuICAgICAgICB2YWx1ZTogYW55O1xyXG4gICAgICAgIGlzVG91Y2hpbmc6IGFueTtcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgSURyb3BMaW5rQXR0cmlidXRlcyBleHRlbmRzIG5nLklBdHRyaWJ1dGVzIHtcclxuICAgICAgICBwaXBEcm9wOiBhbnk7XHJcbiAgICAgICAgcGlwRHJvcFN1Y2Nlc3M6IGFueTtcclxuICAgICAgICBwaXBEcmFnU3RhcnQ6IGFueTtcclxuICAgICAgICBwaXBEcmFnU3RvcDogYW55O1xyXG4gICAgICAgIHBpcERyYWdNb3ZlOiBhbnk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgRHJvcExpbmsge1xyXG5cclxuICAgICAgICBwcml2YXRlIF9sYXN0RHJvcFRvdWNoOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBfbXlpZDogbnVtYmVyIHwgc3RyaW5nO1xyXG4gICAgICAgIHByaXZhdGUgX2Ryb3BFbmFibGVkOiBib29sZWFuO1xyXG5cclxuICAgICAgICBwcml2YXRlIG9uRHJvcENhbGxiYWNrOiBGdW5jdGlvbjsgLy8gfHwgZnVuY3Rpb24oKXt9O1xyXG4gICAgICAgIHByaXZhdGUgb25EcmFnU3RhcnRDYWxsYmFjazogRnVuY3Rpb247XHJcbiAgICAgICAgcHJpdmF0ZSBvbkRyYWdTdG9wQ2FsbGJhY2s6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHByaXZhdGUgb25EcmFnTW92ZUNhbGxiYWNrOiBGdW5jdGlvbjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHBhcnNlOiBuZy5JUGFyc2VTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRkb2N1bWVudDogbmcuSURvY3VtZW50U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIHBpcERyYWdnYWJsZTogSURyYWdnYWJsZVNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHNjb3BlOiBJRHJvcExpbmtTY29wZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICBwcml2YXRlICRhdHRyczogSURyb3BMaW5rQXR0cmlidXRlc1xyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICAkc2NvcGUudmFsdWUgPSAkYXR0cnMucGlwRHJvcDtcclxuICAgICAgICAgICAgJHNjb3BlLmlzVG91Y2hpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuX215aWQgPSAkc2NvcGUuJGlkO1xyXG4gICAgICAgICAgICB0aGlzLm9uRHJvcENhbGxiYWNrID0gJHBhcnNlKCRhdHRycy5waXBEcm9wU3VjY2Vzcyk7IC8vIHx8IGZ1bmN0aW9uKCl7fTtcclxuICAgICAgICAgICAgdGhpcy5vbkRyYWdTdGFydENhbGxiYWNrID0gJHBhcnNlKCRhdHRycy5waXBEcmFnU3RhcnQpO1xyXG4gICAgICAgICAgICB0aGlzLm9uRHJhZ1N0b3BDYWxsYmFjayA9ICRwYXJzZSgkYXR0cnMucGlwRHJhZ1N0b3ApO1xyXG4gICAgICAgICAgICB0aGlzLm9uRHJhZ01vdmVDYWxsYmFjayA9ICRwYXJzZSgkYXR0cnMucGlwRHJhZ01vdmUpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudG9nZ2xlTGlzdGVuZXJzKHRydWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSB0b2dnbGVMaXN0ZW5lcnMoZW5hYmxlKSB7XHJcbiAgICAgICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lcnNcclxuICAgICAgICAgICAgaWYgKCFlbmFibGUpIHJldHVybjtcclxuICAgICAgICAgICAgLy8gYWRkIGxpc3RlbmVycy5cclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJHdhdGNoKHRoaXMuJGF0dHJzLnBpcERyb3AsIChuZXdWYWwsIG9sZFZhbCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkVuYWJsZUNoYW5nZShuZXdWYWwsIG9sZFZhbCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJyRkZXN0cm95JywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRGVzdHJveShldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJ2RyYWdnYWJsZTpzdGFydCcsIChldnQsIG9iaikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdTdGFydChldnQsIG9iaik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLiRzY29wZS4kb24oJ2RyYWdnYWJsZTptb3ZlJywgKGV2dCwgb2JqKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ01vdmUoZXZ0LCBvYmopO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuJG9uKCdkcmFnZ2FibGU6ZW5kJywgKGV2dCwgb2JqKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ0VuZChldnQsIG9iaik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkRlc3Ryb3koZW5hYmxlKSB7XHJcbiAgICAgICAgICAgIHRoaXMudG9nZ2xlTGlzdGVuZXJzKGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25FbmFibGVDaGFuZ2UobmV3VmFsLCBvbGRWYWwpIHtcclxuICAgICAgICAgICAgdGhpcy5fZHJvcEVuYWJsZWQgPSBuZXdWYWw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRHJhZ1N0YXJ0KGV2dCwgb2JqKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5fZHJvcEVuYWJsZWQpIHJldHVybjtcclxuICAgICAgICAgICAgdGhpcy5pc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuJGF0dHJzLnBpcERyYWdTdGFydCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkRyYWdTdGFydENhbGxiYWNrKHRoaXMuJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkYXRhOiBvYmouZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBvYmpcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRHJhZ01vdmUoZXZ0LCBvYmopIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9kcm9wRW5hYmxlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICB0aGlzLmlzVG91Y2hpbmcob2JqLngsIG9iai55LCBvYmouZWxlbWVudCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy4kYXR0cnMucGlwRHJhZ01vdmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25EcmFnTW92ZUNhbGxiYWNrKHRoaXMuJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkYXRhOiBvYmouZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiBvYmpcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRHJhZ0VuZChldnQsIG9iaikge1xyXG4gICAgICAgICAgICAvLyBkb24ndCBsaXN0ZW4gdG8gZHJvcCBldmVudHMgaWYgdGhpcyBpcyB0aGUgZWxlbWVudCBiZWluZyBkcmFnZ2VkXHJcbiAgICAgICAgICAgIC8vIG9ubHkgdXBkYXRlIHRoZSBzdHlsZXMgYW5kIHJldHVyblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2Ryb3BFbmFibGVkIHx8IHRoaXMuX215aWQgPT09IG9iai51aWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRHJhZ1N0eWxlcyhmYWxzZSwgb2JqLmVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5pc1RvdWNoaW5nKG9iai54LCBvYmoueSwgb2JqLmVsZW1lbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjYWxsIHRoZSBwaXBEcmFnZ2FibGUgcGlwRHJhZ1N1Y2Nlc3MgZWxlbWVudCBjYWxsYmFja1xyXG4gICAgICAgICAgICAgICAgaWYgKG9iai5jYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9iai5jYWxsYmFjayhvYmopO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLiRhdHRycy5waXBEcm9wU3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRHJvcENhbGxiYWNrKHRoaXMuJHNjb3BlLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZGF0YTogb2JqLmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IG9iaixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0YXJnZXQ6IHRoaXMuJHNjb3BlLiRldmFsKHRoaXMuJHNjb3BlLnZhbHVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuJGF0dHJzLnBpcERyYWdTdG9wKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiR0aW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRHJhZ1N0b3BDYWxsYmFjayh0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZGF0YTogb2JqLmRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRldmVudDogb2JqXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVEcmFnU3R5bGVzKGZhbHNlLCBvYmouZWxlbWVudCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGlzVG91Y2hpbmcobW91c2VYLCBtb3VzZVksIGRyYWdFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRvdWNoaW5nID0gdGhpcy5oaXRUZXN0KG1vdXNlWCwgbW91c2VZKTtcclxuICAgICAgICAgICAgdGhpcy4kc2NvcGUuaXNUb3VjaGluZyA9IHRvdWNoaW5nO1xyXG4gICAgICAgICAgICBpZiAodG91Y2hpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2xhc3REcm9wVG91Y2ggPSB0aGlzLiRlbGVtZW50O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRHJhZ1N0eWxlcyh0b3VjaGluZywgZHJhZ0VsZW1lbnQpO1xyXG4gICAgICAgICAgICByZXR1cm4gdG91Y2hpbmc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHVwZGF0ZURyYWdTdHlsZXModG91Y2hpbmcsIGRyYWdFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGlmICh0b3VjaGluZykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygncGlwLWRyYWctZW50ZXInKTtcclxuICAgICAgICAgICAgICAgIGRyYWdFbGVtZW50LmFkZENsYXNzKCdwaXAtZHJhZy1vdmVyJyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5fbGFzdERyb3BUb3VjaCA9PSB0aGlzLiRlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9sYXN0RHJvcFRvdWNoID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ3BpcC1kcmFnLWVudGVyJyk7XHJcbiAgICAgICAgICAgICAgICBkcmFnRWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWRyYWctb3ZlcicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoaXRUZXN0KHgsIHkpIHtcclxuICAgICAgICAgICAgY29uc3QgYm91bmRzID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICAgICAgeCAtPSB0aGlzLiRkb2N1bWVudFswXS5ib2R5LnNjcm9sbExlZnQgKyB0aGlzLiRkb2N1bWVudFswXS5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdDtcclxuICAgICAgICAgICAgeSAtPSB0aGlzLiRkb2N1bWVudFswXS5ib2R5LnNjcm9sbFRvcCArIHRoaXMuJGRvY3VtZW50WzBdLmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICAgICAgICAgIHJldHVybiB4ID49IGJvdW5kcy5sZWZ0ICYmXHJcbiAgICAgICAgICAgICAgICB4IDw9IGJvdW5kcy5yaWdodCAmJlxyXG4gICAgICAgICAgICAgICAgeSA8PSBib3VuZHMuYm90dG9tICYmXHJcbiAgICAgICAgICAgICAgICB5ID49IGJvdW5kcy50b3A7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IERyb3AgPSBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHBhcnNlOiBuZy5JUGFyc2VTZXJ2aWNlLFxyXG4gICAgICAgICRkb2N1bWVudDogbmcuSURvY3VtZW50U2VydmljZSxcclxuICAgICAgICAkdGltZW91dDogbmcuSVRpbWVvdXRTZXJ2aWNlLFxyXG4gICAgICAgIHBpcERyYWdnYWJsZTogSURyYWdnYWJsZVNlcnZpY2UsXHJcbiAgICApOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoXHJcbiAgICAgICAgICAgICAgICAkc2NvcGU6IElEcm9wTGlua1Njb3BlLFxyXG4gICAgICAgICAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAgICAgICAgICRhdHRyczogSURyb3BMaW5rQXR0cmlidXRlc1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIG5ldyBEcm9wTGluaygkcGFyc2UsICRkb2N1bWVudCwgJHRpbWVvdXQsIHBpcERyYWdnYWJsZSwgJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZShcInBpcERyYWdnYWJsZVwiKVxyXG4gICAgICAgIC5kaXJlY3RpdmUoJ3BpcERyb3AnLCBEcm9wKTtcclxufSIsIntcclxuXHJcbiAgICBjbGFzcyBQcmV2ZW50RHJhZ0xpbmsge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRlbGVtZW50OiBKUXVlcnlcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGluaXRpYWxpemUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuYXR0cigncGlwLWRyYWdnYWJsZScsICdmYWxzZScpO1xyXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZUxpc3RlbmVycyh0cnVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgdG9nZ2xlTGlzdGVuZXJzKGVuYWJsZSkge1xyXG4gICAgICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXJzXHJcbiAgICAgICAgICAgIGlmICghZW5hYmxlKSByZXR1cm47XHJcbiAgICAgICAgICAgIC8vIGFkZCBsaXN0ZW5lcnMuXHJcbiAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsIChldmVudCkgPT4geyB0aGlzLmFic29yYkV2ZW50XyhldmVudCk7IH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBhYnNvcmJFdmVudF8oZXZlbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgZSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQgJiYgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbiAmJiBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgUHJldmVudERyYWcgPSBmdW5jdGlvbiAoKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKFxyXG4gICAgICAgICAgICAgICAgJHNjb3BlOiBuZy5JU2NvcGUsXHJcbiAgICAgICAgICAgICAgICAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAgICAgJGF0dHJzOiBuZy5JQXR0cmlidXRlc1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIG5ldyBQcmV2ZW50RHJhZ0xpbmsoJGVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKFwicGlwRHJhZ2dhYmxlXCIpXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwUHJldmVudERyYWcnLCBQcmV2ZW50RHJhZyk7XHJcbn0iLCJhbmd1bGFyLm1vZHVsZShcInBpcERyYWdnYWJsZVwiLCBbXSk7XHJcblxyXG5pbXBvcnQgJy4vRHJhZ2dhYmxlU2VydmljZSc7XHJcbmltcG9ydCAnLi9EcmFnJztcclxuaW1wb3J0ICcuL0Ryb3AnO1xyXG5pbXBvcnQgJy4vUHJldmVudERyYWcnO1xyXG5pbXBvcnQgJy4vQ2FuY2VsRHJhZyc7XHJcbiIsIntcclxuICAgIGludGVyZmFjZSBGb2N1c2VkU2NvcGUgZXh0ZW5kcyBuZy5JU2NvcGUge1xyXG4gICAgICAgIHBpcEZvY3VzZWRDb2xvcjogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwRm9jdXNlZENsYXNzOiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBGb2N1c2VkUmViaW5kOiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBGb2N1c2VkVGFiaW5kZXg6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHBpcEZvY3VzZWRPcGFjaXR5OiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBGb2N1c2VkRGF0YTogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwV2l0aEhpZGRlbjogRnVuY3Rpb247XHJcbiAgICAgICAgcGlwUmViaW5kOiBGdW5jdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBpbnRlcmZhY2UgRm9jdXNlZEF0dHJpYnV0ZXMgZXh0ZW5kcyBuZy5JQXR0cmlidXRlcyB7XHJcbiAgICAgICAgbmdNb2RlbDogYW55O1xyXG4gICAgICAgIHBpcEZvY3VzZWREYXRhOiBhbnk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgRm9jdXNlZExpbmsgaW1wbGVtZW50cyBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICBwcml2YXRlIGNvbnRyb2xzOiBKUXVlcnk7XHJcbiAgICAgICAgcHJpdmF0ZSBjb250cm9sc0xlbmd0aDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgY29sb3I6IHN0cmluZztcclxuICAgICAgICBwcml2YXRlIG9wYWNpdHlEZWx0YTogbnVtYmVyID0gMC40O1xyXG4gICAgICAgIHByaXZhdGUgb3BhY2l0eUxpbWl0OiBudW1iZXIgPSAwLjU7XHJcbiAgICAgICAgcHJpdmF0ZSBvbGRCYWNrZ3JvdW5kQ29sb3I6IHN0cmluZztcclxuICAgICAgICBwcml2YXRlIG9uRm9jdXNDbGFzczogc3RyaW5nO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IEZvY3VzZWRTY29wZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICAkYXR0cnM6IEZvY3VzZWRBdHRyaWJ1dGVzLFxyXG4gICAgICAgICAgICBwcml2YXRlICR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJG1kQ29uc3RhbnQ6IGFueSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZVxyXG4gICAgICAgICkge1xyXG5cclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2tleWRvd24nLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5rZXlkb3duTGlzdGVuZXIoZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJHRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCRhdHRycy5uZ01vZGVsKSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCduZ01vZGVsJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KHRoaXMuaW5pdCk7XHJcbiAgICAgICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCRhdHRycy5waXBGb2N1c2VkRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwRm9jdXNlZERhdGEnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQodGhpcy5pbml0KTtcclxuICAgICAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGluaXQoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gdGhpcy4kc2NvcGUucGlwV2l0aEhpZGRlbiAmJiB0aGlzLiRzY29wZS5waXBXaXRoSGlkZGVuKCkgPyAnLnBpcC1mb2N1c2FibGUnIDogJy5waXAtZm9jdXNhYmxlOnZpc2libGUnO1xyXG4gICAgICAgICAgICB0aGlzLm9uRm9jdXNDbGFzcyA9IHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRDbGFzcyA/IHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRDbGFzcygpIDogJyc7XHJcbiAgICAgICAgICAgIHRoaXMuY29udHJvbHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoc2VsZWN0b3IpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xzTGVuZ3RoID0gdGhpcy5jb250cm9scy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlY2tUYWJpbmRleCh0aGlzLmNvbnRyb2xzKTtcclxuICAgICAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyc1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xzLm9uKCdmb2N1cycsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZXZlbnQuY3VycmVudFRhcmdldDtcclxuICAgICAgICAgICAgICAgIGlmICgkKHRhcmdldCkuaGFzQ2xhc3MoJ21kLWZvY3VzZWQnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLiRzY29wZS5waXBSZWJpbmQgJiYgdGhpcy4kc2NvcGUucGlwUmViaW5kKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3BpcC1mb2N1c2VkLWNvbnRhaW5lcicpO1xyXG4gICAgICAgICAgICAgICAgJCh0YXJnZXQpLmFkZENsYXNzKHRoaXMub25Gb2N1c0NsYXNzKTtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy4kc2NvcGUucGlwRm9jdXNlZE9wYWNpdHkgfHwgIXRoaXMuJHNjb3BlLnBpcEZvY3VzZWRPcGFjaXR5KCkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xvciA9ICQodGFyZ2V0KS5jc3MoJ2JhY2tncm91bmRDb2xvcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2xkQmFja2dyb3VuZENvbG9yID0gdGhpcy5jb2xvcjtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCB0aGlzLnJnYmEodGhpcy5jb2xvcikpO1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5hZGRDbGFzcygnbWQtZm9jdXNlZCcpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkuYWRkQ2xhc3MoJ21kLWZvY3VzZWQgbWQtZm9jdXNlZC1vcGFjaXR5Jyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9KS5vbignZm9jdXNvdXQnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoISQodGFyZ2V0KS5oYXNDbGFzcygnbWQtZm9jdXNlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygncGlwLWZvY3VzZWQtY29udGFpbmVyJyk7XHJcbiAgICAgICAgICAgICAgICAkKHRhcmdldCkucmVtb3ZlQ2xhc3ModGhpcy5vbkZvY3VzQ2xhc3MpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLiRzY29wZS5waXBGb2N1c2VkT3BhY2l0eSB8fCAhdGhpcy4kc2NvcGUucGlwRm9jdXNlZE9wYWNpdHkoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5jc3MoJ2JhY2tncm91bmRDb2xvcicsIHRoaXMub2xkQmFja2dyb3VuZENvbG9yKTtcclxuICAgICAgICAgICAgICAgICAgICAkKHRhcmdldCkucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQgbWQtZm9jdXNlZC1vcGFjaXR5Jyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQodGFyZ2V0KS5yZW1vdmVDbGFzcygnbWQtZm9jdXNlZCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgcmdiYShjb2xvcikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kc2NvcGUucGlwRm9jdXNlZENvbG9yICYmIHRoaXMuJHNjb3BlLnBpcEZvY3VzZWRDb2xvcigpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kc2NvcGUucGlwRm9jdXNlZENvbG9yKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFyciA9IGNvbG9yLnNwbGl0KFwiKFwiKVsxXS5zcGxpdChcIilcIilbMF0uc3BsaXQoXCIsXCIpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFhcnIgfHwgYXJyLmxlbmd0aCA8IDMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnJ1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcmVkLCBibHVlLCBncmVlbiwgb3BhY2l0eTtcclxuXHJcbiAgICAgICAgICAgIG9wYWNpdHkgPSBhcnIubGVuZ3RoID09IDMgPyAxIDogcGFyc2VGbG9hdChhcnJbM10pO1xyXG4gICAgICAgICAgICByZWQgPSBhcnJbMF07XHJcbiAgICAgICAgICAgIGJsdWUgPSBhcnJbMV07XHJcbiAgICAgICAgICAgIGdyZWVuID0gYXJyWzJdO1xyXG5cclxuICAgICAgICAgICAgaWYgKG9wYWNpdHkgPCB0aGlzLm9wYWNpdHlMaW1pdCkge1xyXG4gICAgICAgICAgICAgICAgb3BhY2l0eSArPSB0aGlzLm9wYWNpdHlEZWx0YTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG9wYWNpdHkgLT0gdGhpcy5vcGFjaXR5RGVsdGE7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiAncmdiYSgnICsgcmVkICsgJywgJyArIGJsdWUgKyAnLCAnICsgZ3JlZW4gKyAnLCAnICsgb3BhY2l0eSArICcpJztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgc2V0VGFiaW5kZXgoZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIHZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY2hlY2tUYWJpbmRleChjb250cm9scykge1xyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IF8uZmluZEluZGV4KGNvbnRyb2xzLCAoYykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNbJ3RhYmluZGV4J10gPiAtMTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaW5kZXggPT0gLTEgJiYgY29udHJvbHMubGVuZ3RoID4gMCAmJiB0aGlzLiRzY29wZS5waXBGb2N1c2VkVGFiaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0VGFiaW5kZXgoYW5ndWxhci5lbGVtZW50KGNvbnRyb2xzWzBdKSwgdGhpcy4kc2NvcGUucGlwRm9jdXNlZFRhYmluZGV4KCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGtleWRvd25MaXN0ZW5lcihlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleUNvZGUgPSBlLndoaWNoIHx8IGUua2V5Q29kZTtcclxuICAgICAgICAgICAgLy8gQ2hlY2sgY29udHJvbCBrZXlDb2RlXHJcbiAgICAgICAgICAgIGlmIChrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuTEVGVF9BUlJPVyB8fFxyXG4gICAgICAgICAgICAgICAga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlVQX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHxcclxuICAgICAgICAgICAgICAgIGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5ET1dOX0FSUk9XXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0XHJcbiAgICAgICAgICAgICAgICAgICAgaW5jcmVtZW50ID0gKGtleUNvZGUgPT0gdGhpcy4kbWRDb25zdGFudC5LRVlfQ09ERS5SSUdIVF9BUlJPVyB8fCBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuRE9XTl9BUlJPVykgPyAxIDogLTEsXHJcbiAgICAgICAgICAgICAgICAgICAgbW92ZVRvQ29udHJvbCA9IHRoaXMuY29udHJvbHMuaW5kZXgodGhpcy5jb250cm9scy5maWx0ZXIoXCIubWQtZm9jdXNlZFwiKSkgKyBpbmNyZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAvLyBNb3ZlIGZvY3VzIHRvIG5leHQgY29udHJvbFxyXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVUb0NvbnRyb2wgPj0gMCAmJiBtb3ZlVG9Db250cm9sIDwgdGhpcy5jb250cm9sc0xlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29udHJvbHNbbW92ZVRvQ29udHJvbF0uZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBGb2N1c2VkID0gZnVuY3Rpb24gKCR0aW1lb3V0OiBuZy5JVGltZW91dFNlcnZpY2UsIFxyXG4gICAgICAgICRtZENvbnN0YW50OiBhbnksIFxyXG4gICAgICAgICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlXHJcbiAgICApOiBuZy5JRGlyZWN0aXZlIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICAgICAgcGlwRm9jdXNlZENvbG9yOiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwRm9jdXNlZENsYXNzOiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwRm9jdXNlZFJlYmluZDogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRUYWJpbmRleDogJyY/JyxcclxuICAgICAgICAgICAgICAgIHBpcEZvY3VzZWRPcGFjaXR5OiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwRm9jdXNlZERhdGE6ICcmPycsXHJcbiAgICAgICAgICAgICAgICBwaXBXaXRoSGlkZGVuOiAnJj8nLFxyXG4gICAgICAgICAgICAgICAgcGlwUmViaW5kOiAnJj8nXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZTogRm9jdXNlZFNjb3BlLCAkZWxlbWVudDogSlF1ZXJ5LCAkYXR0cnM6IEZvY3VzZWRBdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgRm9jdXNlZExpbmsoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCAkdGltZW91dCwgJG1kQ29uc3RhbnQsICR3aW5kb3cpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKFwicGlwRm9jdXNlZFwiLCBbXSlcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBGb2N1c2VkJywgRm9jdXNlZCk7XHJcbn0iLCLvu79pbXBvcnQgJy4vdW5zYXZlZF9jaGFuZ2VzL3Vuc2F2ZWRDaGFuZ2VzJztcclxuaW1wb3J0ICcuL3Nob3J0Y3V0cy9pbmRleCc7XHJcbmltcG9ydCAnLi9mb2N1c2VkL2ZvY3VzZWQnO1xyXG5pbXBvcnQgJy4vZHJhZ2dhYmxlL2luZGV4JztcclxuaW1wb3J0ICcuL3NlbGVjdGVkL3NlbGVjdGVkJztcclxuaW1wb3J0ICcuL2luZmluaXRlX3Njcm9sbC9pbmZpbml0ZVNjcm9sbCc7XHJcblxyXG5hbmd1bGFyLm1vZHVsZSgncGlwQmVoYXZpb3JzJywgW1xyXG4gICAgJ3BpcEZvY3VzZWQnLFxyXG4gICAgJ3BpcFNlbGVjdGVkJyxcclxuICAgICdwaXBJbmZpbml0ZVNjcm9sbCcsXHJcbiAgICAncGlwVW5zYXZlZENoYW5nZXMnLFxyXG4gICAgJ3BpcERyYWdnYWJsZScsXHJcbiAgICAncGlwU2hvcnRjdXRzJ1xyXG5dKTtcclxuXHJcbmV4cG9ydCAqIGZyb20gJy4vc2hvcnRjdXRzL2luZGV4JztcclxuIiwie1xyXG4gICAgaW50ZXJmYWNlIEluZmluaXRlU2Nyb2xsU2NvcGUgZXh0ZW5kcyBuZy5JU2NvcGUge1xyXG4gICAgICAgIHBpcEluZmluaXRlU2Nyb2xsOiBGdW5jdGlvbjtcclxuICAgICAgICBwaXBTY3JvbGxDb250YWluZXI6IEpRdWVyeTtcclxuICAgICAgICBwaXBTY3JvbGxEaXN0YW5jZTogbnVtYmVyIHwgc3RyaW5nO1xyXG4gICAgICAgIHBpcFNjcm9sbERpc2FibGVkOiBib29sZWFuO1xyXG4gICAgICAgIHBpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tOiBib29sZWFuO1xyXG4gICAgICAgIHBpcFNjcm9sbExpc3RlbkZvckV2ZW50OiBzdHJpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgaW50ZXJmYWNlIEluZmluaXRlU2Nyb2xsQXR0cmlidXRlcyBleHRlbmRzIG5nLklBdHRyaWJ1dGVzIHtcclxuICAgICAgICBwaXBTY3JvbGxQYXJlbnQ6IGFueTtcclxuICAgICAgICBwaXBTY3JvbEltbWVkaWF0ZUNoZWNrOiBhbnk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgSW5maW5pdGVTY3JvbGxMaW5rIHtcclxuICAgICAgICBwcml2YXRlIFRIUk9UVExFX01JTExJU0VDT05EUzogbnVtYmVyID0gNTAwO1xyXG4gICAgICAgIHByaXZhdGUgY2hlY2tXaGVuRW5hYmxlZCA9IG51bGw7XHJcbiAgICAgICAgcHJpdmF0ZSBzY3JvbGxDb250YWluZXIgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgaW1tZWRpYXRlQ2hlY2sgPSB0cnVlO1xyXG4gICAgICAgIHByaXZhdGUgc2Nyb2xsRGlzdGFuY2UgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgc2Nyb2xsRW5hYmxlZCA9IG51bGw7XHJcbiAgICAgICAgcHJpdmF0ZSB1bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lciA9IG51bGw7XHJcbiAgICAgICAgcHJpdmF0ZSB1c2VEb2N1bWVudEJvdHRvbSA9IGZhbHNlO1xyXG4gICAgICAgIHByaXZhdGUgd2luZG93RWxlbWVudCA9IG51bGw7XHJcbiAgICAgICAgcHJpdmF0ZSBvbkNvbnRhaW5lclNjcm9sbFRocm90dGxlOiBGdW5jdGlvbjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHJvb3RTY29wZTogbmcuSVJvb3RTY29wZVNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGludGVydmFsOiBuZy5JSW50ZXJ2YWxTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRzY29wZTogSW5maW5pdGVTY3JvbGxTY29wZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICBwcml2YXRlICRhdHRyczogSW5maW5pdGVTY3JvbGxBdHRyaWJ1dGVzXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2luZG93RWxlbWVudCA9IGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSA9IF8udGhyb3R0bGUoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbCgpO1xyXG4gICAgICAgICAgICB9LCB0aGlzLlRIUk9UVExFX01JTExJU0VDT05EUyk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsQ29udGFpbmVyLnVuYmluZCgnc2Nyb2xsJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy51bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lciAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5yZWdpc3RlckV2ZW50TGlzdGVuZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy51bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCgncGlwU2Nyb2xsRGlzdGFuY2UnLCAodikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxEaXN0YW5jZSh2KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsRGlzdGFuY2UoJHNjb3BlLnBpcFNjcm9sbERpc3RhbmNlKTtcclxuXHJcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbERpc2FibGVkJywgKHYpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsRGlzYWJsZWQodik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbERpc2FibGVkKCRzY29wZS5waXBTY3JvbGxEaXNhYmxlZCk7XHJcblxyXG4gICAgICAgICAgICAkc2NvcGUuJHdhdGNoKCdwaXBTY3JvbGxVc2VEb2N1bWVudEJvdHRvbScsICh2KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNjcm9sbFVzZURvY3VtZW50Qm90dG9tKHYpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxVc2VEb2N1bWVudEJvdHRvbSgkc2NvcGUucGlwU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jaGFuZ2VDb250YWluZXIodGhpcy53aW5kb3dFbGVtZW50KTtcclxuICAgICAgICAgICAgaWYgKCRzY29wZS5waXBTY3JvbGxMaXN0ZW5Gb3JFdmVudCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51bnJlZ2lzdGVyRXZlbnRMaXN0ZW5lciA9ICRyb290U2NvcGUuJG9uKCRzY29wZS5waXBTY3JvbGxMaXN0ZW5Gb3JFdmVudCwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25Db250YWluZXJTY3JvbGxUaHJvdHRsZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICRzY29wZS4kd2F0Y2goJ3BpcFNjcm9sbENvbnRhaW5lcicsIChuZXdDb250YWluZXIpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIgIT0gdGhpcy5zY3JvbGxDb250YWluZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTY3JvbGxDb250YWluZXIobmV3Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlU2Nyb2xsQ29udGFpbmVyKCRzY29wZS5waXBTY3JvbGxDb250YWluZXIgfHwgW10pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCRhdHRycy5waXBTY3JvbGxQYXJlbnQgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlQ29udGFpbmVyKGFuZ3VsYXIuZWxlbWVudCgkZWxlbWVudC5wYXJlbnQoKSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICgkYXR0cnMucGlwU2Nyb2xJbW1lZGlhdGVDaGVjayAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbW1lZGlhdGVDaGVjayA9ICRzY29wZS4kZXZhbCgkYXR0cnMucGlwU2Nyb2xJbW1lZGlhdGVDaGVjayk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICRpbnRlcnZhbCgoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW1tZWRpYXRlQ2hlY2spIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pLCAwLCAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGVpZ2h0KGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnRbMF0gfHwgZWxlbWVudDtcclxuICAgICAgICAgICAgaWYgKGlzTmFOKGVsZW1lbnQub2Zmc2V0SGVpZ2h0KSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50Lm9mZnNldEhlaWdodDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvZmZzZXRUb3AoZWxlbWVudCkge1xyXG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0IHx8IGVsZW1lbnQuY3NzKCdub25lJykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgKyB0aGlzLnBhZ2VZT2Zmc2V0KGVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBwYWdlWU9mZnNldChlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50WzBdIHx8IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGlmIChpc05hTih3aW5kb3cucGFnZVlPZmZzZXQpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5wYWdlWU9mZnNldDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbkNvbnRhaW5lclNjcm9sbCgpIHtcclxuICAgICAgICAgICAgbGV0IGNvbnRhaW5lckJvdHRvbSxcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcE9mZnNldCxcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRCb3R0b20sXHJcbiAgICAgICAgICAgICAgICByZW1haW5pbmcsXHJcbiAgICAgICAgICAgICAgICBzaG91bGRTY3JvbGw7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5zY3JvbGxDb250YWluZXIgPT09IHRoaXMud2luZG93RWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyQm90dG9tID0gdGhpcy5oZWlnaHQodGhpcy5zY3JvbGxDb250YWluZXIpICsgdGhpcy5wYWdlWU9mZnNldCh0aGlzLnNjcm9sbENvbnRhaW5lclswXS5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSA9IHRoaXMub2Zmc2V0VG9wKHRoaXMuJGVsZW1lbnQpICsgdGhpcy5oZWlnaHQodGhpcy4kZWxlbWVudCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJCb3R0b20gPSB0aGlzLmhlaWdodCh0aGlzLnNjcm9sbENvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJUb3BPZmZzZXQgPSAwO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub2Zmc2V0VG9wKHRoaXMuc2Nyb2xsQ29udGFpbmVyKSAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyVG9wT2Zmc2V0ID0gdGhpcy5vZmZzZXRUb3AodGhpcy5zY3JvbGxDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxlbWVudEJvdHRvbSA9IHRoaXMub2Zmc2V0VG9wKHRoaXMuJGVsZW1lbnQpIC0gY29udGFpbmVyVG9wT2Zmc2V0ICsgdGhpcy5oZWlnaHQodGhpcy4kZWxlbWVudCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnVzZURvY3VtZW50Qm90dG9tKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50Qm90dG9tID0gdGhpcy5oZWlnaHQoKHRoaXMuJGVsZW1lbnRbMF0ub3duZXJEb2N1bWVudCB8fCAoIDwgYW55ID4gdGhpcy4kZWxlbWVudFswXSkuZG9jdW1lbnQpLmRvY3VtZW50RWxlbWVudCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlbWFpbmluZyA9IGVsZW1lbnRCb3R0b20gLSBjb250YWluZXJCb3R0b207XHJcbiAgICAgICAgICAgIHNob3VsZFNjcm9sbCA9IHJlbWFpbmluZyA8PSB0aGlzLmhlaWdodCh0aGlzLnNjcm9sbENvbnRhaW5lcikgKiB0aGlzLnNjcm9sbERpc3RhbmNlICsgMTtcclxuXHJcbiAgICAgICAgICAgIGlmIChzaG91bGRTY3JvbGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tXaGVuRW5hYmxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zY3JvbGxFbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuJHNjb3BlLiQkcGhhc2UgfHwgdGhpcy4kcm9vdFNjb3BlLiQkcGhhc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHNjb3BlLnBpcEluZmluaXRlU2Nyb2xsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHNjb3BlLiRhcHBseSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS5waXBJbmZpbml0ZVNjcm9sbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jaGVja1doZW5FbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGFuZGxlU2Nyb2xsRGlzdGFuY2Uodikge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxEaXN0YW5jZSA9IHBhcnNlRmxvYXQodikgfHwgMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGFuZGxlU2Nyb2xsRGlzYWJsZWQodikge1xyXG4gICAgICAgICAgICB0aGlzLnNjcm9sbEVuYWJsZWQgPSAhdjtcclxuICAgICAgICAgICAgaWYgKHRoaXMuc2Nyb2xsRW5hYmxlZCAmJiB0aGlzLmNoZWNrV2hlbkVuYWJsZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tXaGVuRW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkNvbnRhaW5lclNjcm9sbFRocm90dGxlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGFuZGxlU2Nyb2xsVXNlRG9jdW1lbnRCb3R0b20odikge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy51c2VEb2N1bWVudEJvdHRvbSA9IHY7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNoYW5nZUNvbnRhaW5lcihuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuc2Nyb2xsQ29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lci51bmJpbmQoJ3Njcm9sbCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNjcm9sbENvbnRhaW5lciA9IG5ld0NvbnRhaW5lcjtcclxuICAgICAgICAgICAgaWYgKG5ld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Nyb2xsQ29udGFpbmVyLmJpbmQoJ3Njcm9sbCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQ29udGFpbmVyU2Nyb2xsVGhyb3R0bGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNjcm9sbENvbnRhaW5lcihuZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgaWYgKChuZXdDb250YWluZXIgPT0gbnVsbCkgfHwgbmV3Q29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChuZXdDb250YWluZXIgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgbmV3Q29udGFpbmVyID0gYW5ndWxhci5lbGVtZW50KG5ld0NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5ld0NvbnRhaW5lci5hcHBlbmQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIG5ld0NvbnRhaW5lciA9IGFuZ3VsYXIuZWxlbWVudChuZXdDb250YWluZXJbbmV3Q29udGFpbmVyLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbmV3Q29udGFpbmVyID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgbmV3Q29udGFpbmVyID0gdGhpcy4kZWxlbWVudC5wYXJlbnRzKCkuZmluZChuZXdDb250YWluZXIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmV3Q29udGFpbmVyICE9IG51bGwgJiYgKCFBcnJheS5pc0FycmF5KG5ld0NvbnRhaW5lcikgfHxcclxuICAgICAgICAgICAgICAgICAgICAoQXJyYXkuaXNBcnJheShuZXdDb250YWluZXIpICYmIG5ld0NvbnRhaW5lci5sZW5ndGggPiAwKSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNoYW5nZUNvbnRhaW5lcihuZXdDb250YWluZXIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBwaXAtc2Nyb2xsLWNvbnRhaW5lciBhdHRyaWJ1dGUuXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBJbmZpbml0ZVNjcm9sbCA9IGZ1bmN0aW9uIChcclxuICAgICAgICAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSxcclxuICAgICAgICAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICAkaW50ZXJ2YWw6IG5nLklJbnRlcnZhbFNlcnZpY2VcclxuICAgICk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICBwaXBJbmZpbml0ZVNjcm9sbDogJyYnLFxyXG4gICAgICAgICAgICAgICAgcGlwU2Nyb2xsQ29udGFpbmVyOiAnPScsXHJcbiAgICAgICAgICAgICAgICBwaXBTY3JvbGxEaXN0YW5jZTogJz0nLFxyXG4gICAgICAgICAgICAgICAgcGlwU2Nyb2xsRGlzYWJsZWQ6ICc9JyxcclxuICAgICAgICAgICAgICAgIHBpcFNjcm9sbFVzZURvY3VtZW50Qm90dG9tOiAnPScsXHJcbiAgICAgICAgICAgICAgICBwaXBTY3JvbGxMaXN0ZW5Gb3JFdmVudDogJ0AnXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChcclxuICAgICAgICAgICAgICAgICRzY29wZTogSW5maW5pdGVTY3JvbGxTY29wZSxcclxuICAgICAgICAgICAgICAgICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgICAgICAkYXR0cnM6IEluZmluaXRlU2Nyb2xsQXR0cmlidXRlc1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIG5ldyBJbmZpbml0ZVNjcm9sbExpbmsoJHJvb3RTY29wZSwgJHdpbmRvdywgJGludGVydmFsLCAkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKFwicGlwSW5maW5pdGVTY3JvbGxcIiwgW10pXHJcbiAgICAgICAgLmRpcmVjdGl2ZSgncGlwSW5maW5pdGVTY3JvbGwnLCBJbmZpbml0ZVNjcm9sbCk7XHJcbn0iLCJ7XHJcbiAgICBpbnRlcmZhY2UgU2VsZWN0ZWRBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgICAgIHBpcFNlbGVjdGVkOiBhbnk7XHJcbiAgICAgICAgcGlwU2VsZWN0ZWRJZDogYW55O1xyXG4gICAgICAgIHBpcFNlbGVjdDogYW55O1xyXG4gICAgICAgIHBpcEVudGVyU3BhY2VQcmVzczogYW55O1xyXG4gICAgICAgIHBpcE5vU2Nyb2xsOiBhbnk7XHJcbiAgICAgICAgcGlwU2tpcEhpZGRlbjogYW55O1xyXG4gICAgICAgIHBpcFRyZWVMaXN0OiBhbnk7XHJcbiAgICAgICAgcGlwU2VsZWN0ZWRXYXRjaDogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIFNlbGVjdGVkTGluayB7XHJcbiAgICAgICAgcHJpdmF0ZSBpbmRleEdldHRlcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgaW5kZXhTZXR0ZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIGlkU2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBpZEdldHRlcjogYW55O1xyXG4gICAgICAgIHByaXZhdGUgY2hhbmdlR2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBlbnRlclNwYWNlR2V0dGVyOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBub1Njcm9sbDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgbW9kaWZpZXI6IGFueTtcclxuICAgICAgICBwcml2YXRlIGNsYXNzTmFtZTogYW55O1xyXG4gICAgICAgIHByaXZhdGUgc2VsZWN0ZWRJbmRleDogYW55O1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudEVsZW1lbnRUYWJpbmV4OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBwaXBTZWxlY3RlZFdhdGNoOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBpc1Njcm9sbGVkOiBhbnk7XHJcbiAgICAgICAgLy8gVmFyaWFibGVzIGZvciB0b3VjaCBmdW5jdGlvbnNcclxuICAgICAgICBwcml2YXRlIHRvdWNoU3RhcnRYOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSB0b3VjaFN0YXJ0WTogYW55O1xyXG4gICAgICAgIHByaXZhdGUgdHJhY2tpbmdDbGljazogYW55O1xyXG4gICAgICAgIHByaXZhdGUgdHJhY2tpbmdDbGlja1N0YXJ0OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSB0YXJnZXRFbGVtZW50OiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBsYXN0Q2xpY2tUaW1lOiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSBjYW5jZWxOZXh0Q2xpY2s6IGFueTtcclxuICAgICAgICAvLyBDb25zdGFudHMgZm9yIHRvdWNoIGZ1bmN0aW9uc1xyXG4gICAgICAgIHByaXZhdGUgdG91Y2hCb3VuZGFyeTogbnVtYmVyID0gMTA7XHJcbiAgICAgICAgcHJpdmF0ZSB0YXBkZWxheTogbnVtYmVyID0gMjAwO1xyXG4gICAgICAgIHByaXZhdGUgdGFwVGltZW91dDogbnVtYmVyID0gNzAwO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgJHBhcnNlOiBuZy5JUGFyc2VTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRtZENvbnN0YW50OiBhbnksXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkc2NvcGU6IG5nLklTY29wZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkZWxlbWVudDogSlF1ZXJ5LFxyXG4gICAgICAgICAgICBwcml2YXRlICRhdHRyczogU2VsZWN0ZWRBdHRyaWJ1dGVzXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5kZXhHZXR0ZXIgPSAkYXR0cnMucGlwU2VsZWN0ZWQgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdGVkKSA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuaW5kZXhTZXR0ZXIgPSB0aGlzLmluZGV4R2V0dGVyID8gdGhpcy5pbmRleEdldHRlci5hc3NpZ24gOiBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmlkR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdGVkSWQgPyAkcGFyc2UoJGF0dHJzLnBpcFNlbGVjdGVkSWQpIDogbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5pZFNldHRlciA9IHRoaXMuaWRHZXR0ZXIgPyB0aGlzLmlkR2V0dGVyLmFzc2lnbiA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlR2V0dGVyID0gJGF0dHJzLnBpcFNlbGVjdCA/ICRwYXJzZSgkYXR0cnMucGlwU2VsZWN0KSA6IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuZW50ZXJTcGFjZUdldHRlciA9ICRhdHRycy5waXBFbnRlclNwYWNlUHJlc3MgPyAkcGFyc2UoJGF0dHJzLnBpcEVudGVyU3BhY2VQcmVzcykgOiBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLm5vU2Nyb2xsID0gJGF0dHJzLnBpcE5vU2Nyb2xsO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGlmaWVyID0gJGF0dHJzLnBpcFNraXBIaWRkZW4gPyAnOnZpc2libGUnIDogJyc7XHJcbiAgICAgICAgICAgIHRoaXMuY2xhc3NOYW1lID0gJGF0dHJzLnBpcFRyZWVMaXN0ID8gJy5waXAtc2VsZWN0YWJsZS10cmVlJyA6ICcucGlwLXNlbGVjdGFibGUnO1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSB0aGlzLmluZGV4R2V0dGVyKCRzY29wZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEVsZW1lbnRUYWJpbmV4ID0gJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnKTtcclxuICAgICAgICAgICAgdGhpcy5waXBTZWxlY3RlZFdhdGNoID0gJGF0dHJzLnBpcFNlbGVjdGVkV2F0Y2g7XHJcbiAgICAgICAgICAgIHRoaXMuaXNTY3JvbGxlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnLCB0aGlzLmN1cnJlbnRFbGVtZW50VGFiaW5leCB8fCAwKTtcclxuXHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCdjbGljaycsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25DbGlja0V2ZW50KGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCd0b3VjaHN0YXJ0JywgdGhpcy5jbGFzc05hbWUsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vblRvdWNoU3RhcnQoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNobW92ZScsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Ub3VjaE1vdmUoZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ3RvdWNoZW5kJywgdGhpcy5jbGFzc05hbWUsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vblRvdWNoRW5kKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCd0b3VjaGNhbmNlbCcsIHRoaXMuY2xhc3NOYW1lLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Ub3VjaENhbmNlbChldmVudCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAkZWxlbWVudC5vbigna2V5ZG93bicsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbktleURvd24oZXZlbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgJGVsZW1lbnQub24oJ2ZvY3VzaW4nLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMub25Gb2N1c0luKGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICRlbGVtZW50Lm9uKCdmb2N1c291dCcsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkZvY3VzT3V0KGV2ZW50KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBXYXRjaCBzZWxlY3RlZCBpdGVtIGluZGV4XHJcbiAgICAgICAgICAgIGlmICghJGF0dHJzLnBpcFRyZWVMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuJHdhdGNoKHRoaXMuaW5kZXhHZXR0ZXIsIChuZXdTZWxlY3RlZEluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4OiBuZXdTZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS4kd2F0Y2godGhpcy5pZEdldHRlciwgKG5ld1NlbGVjdGVkSWQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtSWQ6IG5ld1NlbGVjdGVkSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFdhdGNoIHJlc3luYyBzZWxlY3Rpb25cclxuICAgICAgICAgICAgaWYgKHRoaXMucGlwU2VsZWN0ZWRXYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLiR3YXRjaCh0aGlzLnBpcFNlbGVjdGVkV2F0Y2gsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBEZWxheSB1cGRhdGUgdG8gYWxsb3cgbmctcmVwZWF0IHRvIHVwZGF0ZSBET01cclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IHRoaXMuaW5kZXhHZXR0ZXIoJHNjb3BlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1JbmRleDogdGhpcy5zZWxlY3RlZEluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gU2VsZWN0IGl0ZW0gZGVmaW5lZCBieSBpbmRleFxyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgaXRlbUluZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICBpdGVtczogJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHNlbGVjdEl0ZW0oaXRlbVBhcmFtcykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc1Njcm9sbGVkKSByZXR1cm47XHJcbiAgICAgICAgICAgIGxldCBpdGVtSW5kZXggPSBpdGVtUGFyYW1zLml0ZW1JbmRleCxcclxuICAgICAgICAgICAgICAgIGl0ZW1JZCA9IGl0ZW1QYXJhbXMuaXRlbUlkLFxyXG4gICAgICAgICAgICAgICAgaXRlbXMgPSBpdGVtUGFyYW1zLml0ZW1zIHx8IHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSArIHRoaXMubW9kaWZpZXIpLFxyXG4gICAgICAgICAgICAgICAgaXRlbXNMZW5ndGggPSBpdGVtcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICBpdGVtID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtUGFyYW1zLml0ZW0pIHJldHVybiBpdGVtUGFyYW1zLml0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA9PT0gdW5kZWZpbmVkICYmIGl0ZW1JbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4ID0gaXRlbXMuaW5kZXgoaXRlbXMuZmlsdGVyKCdbcGlwLWlkPScgKyBpdGVtSWQgKyAnXScpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1JbmRleCA+PSAwICYmIGl0ZW1JbmRleCA8IGl0ZW1zTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtc1tpdGVtSW5kZXhdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcmFpc2VFdmVudCA9IGl0ZW1QYXJhbXMucmFpc2VFdmVudDtcclxuICAgICAgICAgICAgICAgIGl0ZW0gPSBpdGVtKCk7XHJcbiAgICAgICAgICAgIGlmIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LmZpbmQodGhpcy5jbGFzc05hbWUpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCBtZC1mb2N1c2VkJyk7XHJcbiAgICAgICAgICAgICAgICBpdGVtID0gPGFueT5hbmd1bGFyLmVsZW1lbnQoaXRlbSlcclxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NlbGVjdGVkIG1kLWZvY3VzZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5vU2Nyb2xsKSB0aGlzLnNjcm9sbFRvSXRlbShpdGVtKTtcclxuICAgICAgICAgICAgICAgIGlmIChyYWlzZUV2ZW50KSB0aGlzLmRlZmluZVNlbGVjdGVkSW5kZXgoaXRlbXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBkZWZpbmVTZWxlY3RlZEluZGV4KGl0ZW1zKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG9sZFNlbGVjdGVkSW5kZXggPSB0aGlzLnNlbGVjdGVkSW5kZXg7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgaXRlbXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJChpdGVtc1tpbmRleF0pLmhhc0NsYXNzKCdzZWxlY3RlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEluZGV4ID0gaW5kZXg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVJbmRleCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkSXRlbSA9IGFuZ3VsYXIuZWxlbWVudChpdGVtc1t0aGlzLnNlbGVjdGVkSW5kZXhdKSxcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZElkID0gc2VsZWN0ZWRJdGVtLmF0dHIoJ3BpcC1pZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluZGV4U2V0dGVyKSB0aGlzLmluZGV4U2V0dGVyKHRoaXMuJHNjb3BlLCB0aGlzLnNlbGVjdGVkSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaWRTZXR0ZXIpIHRoaXMuaWRTZXR0ZXIodGhpcy4kc2NvcGUsIHNlbGVjdGVkSWQpO1xyXG4gICAgICAgICAgICAgICAgb25TZWxlY3QoKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG9uU2VsZWN0ID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJdGVtID0gYW5ndWxhci5lbGVtZW50KGl0ZW1zW3RoaXMuc2VsZWN0ZWRJbmRleF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBzZWxlY3RlZEl0ZW0uYXR0cigncGlwLWlkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY2hhbmdlR2V0dGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VHZXR0ZXIodGhpcy4kc2NvcGUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHRoaXMuJGVsZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtOiBzZWxlY3RlZEl0ZW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogdGhpcy5zZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHNlbGVjdGVkSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJbmRleDogdGhpcy5zZWxlY3RlZEluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkSW5kZXg6IG9sZFNlbGVjdGVkSW5kZXhcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBFeGVjdXRlIGNhbGxiYWNrIHRvIG5vdGlmeSBhYm91dCBpdGVtIHNlbGVjdFxyXG4gICAgICAgICAgICBpZiAob2xkU2VsZWN0ZWRJbmRleCAhPSB0aGlzLnNlbGVjdGVkSW5kZXggJiYgdGhpcy5zZWxlY3RlZEluZGV4ICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kc2NvcGUuJGFwcGx5KCgpID0+IHsgdXBkYXRlSW5kZXgoKTsgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRzY29wZS4kYXBwbHkoKCkgPT4geyBvblNlbGVjdCgpOyB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByaXZhdGUgc2Nyb2xsVG9JdGVtKCRpdGVtKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm5vU2Nyb2xsIHx8ICEkaXRlbS5vZmZzZXQoKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgY29uc3RcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lclRvcCA9IHRoaXMuJGVsZW1lbnQub2Zmc2V0KCkudG9wLFxyXG4gICAgICAgICAgICAgICAgY29udGFpbmVySGVpZ2h0ID0gdGhpcy4kZWxlbWVudC5oZWlnaHQoKSxcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lckJvdHRvbSA9IGNvbnRhaW5lclRvcCArIGNvbnRhaW5lckhlaWdodCxcclxuICAgICAgICAgICAgICAgIGl0ZW1Ub3AgPSAkaXRlbS5vZmZzZXQoKS50b3AsXHJcbiAgICAgICAgICAgICAgICBpdGVtSGVpZ2h0ID0gJGl0ZW0ub3V0ZXJIZWlnaHQodHJ1ZSksXHJcbiAgICAgICAgICAgICAgICBpdGVtQm90dG9tID0gaXRlbVRvcCArIGl0ZW1IZWlnaHQsXHJcbiAgICAgICAgICAgICAgICBjb250YWluZXJTY3JvbGxUb3AgPSB0aGlzLiRlbGVtZW50LnNjcm9sbFRvcCgpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pc1Njcm9sbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy4kdGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzU2Nyb2xsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfSwgMTAwKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb250YWluZXJUb3AgPiBpdGVtVG9wKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LnNjcm9sbFRvcChjb250YWluZXJTY3JvbGxUb3AgKyBpdGVtVG9wIC0gY29udGFpbmVyVG9wKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChjb250YWluZXJCb3R0b20gPCBpdGVtQm90dG9tKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRlbGVtZW50LnNjcm9sbFRvcChjb250YWluZXJTY3JvbGxUb3AgKyBpdGVtQm90dG9tIC0gY29udGFpbmVyQm90dG9tKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByaXZhdGUgZ2V0VGFyZ2V0RWxlbWVudEZyb21FdmVudFRhcmdldChldmVudFRhcmdldCkge1xyXG4gICAgICAgICAgICAvLyBPbiBzb21lIG9sZGVyIGJyb3dzZXJzIHRoZSBldmVudCB0YXJnZXQgbWF5IGJlIGEgdGV4dCBub2RlLlxyXG4gICAgICAgICAgICBpZiAoZXZlbnRUYXJnZXQubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnRUYXJnZXQucGFyZW50Tm9kZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGV2ZW50VGFyZ2V0O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByaXZhdGUgdG91Y2hIYXNNb3ZlZChldmVudCkge1xyXG4gICAgICAgICAgICBjb25zdCB0b3VjaCA9IGV2ZW50LmNoYW5nZWRUb3VjaGVzWzBdLFxyXG4gICAgICAgICAgICAgICAgYm91bmRhcnkgPSB0aGlzLnRvdWNoQm91bmRhcnk7IC8vIFRvdWNobW92ZSBib3VuZGFyeSwgYmV5b25kIHdoaWNoIGEgY2xpY2sgd2lsbCBiZSBjYW5jZWxsZWQuXHJcblxyXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnModG91Y2gucGFnZVggLSB0aGlzLnRvdWNoU3RhcnRYKSA+IGJvdW5kYXJ5IHx8IE1hdGguYWJzKHRvdWNoLnBhZ2VZIC0gdGhpcy50b3VjaFN0YXJ0WSkgPiBib3VuZGFyeSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcml2YXRlIG9uQ2xpY2tFdmVudChldmVudCkge1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdEl0ZW0oe1xyXG4gICAgICAgICAgICAgICAgaXRlbTogZXZlbnQuY3VycmVudFRhcmdldCxcclxuICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uVG91Y2hTdGFydChldmVudCkge1xyXG4gICAgICAgICAgICBjb25zdCBldiA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAgICAgICAgIGlmIChldlsndGFyZ2V0VG91Y2hlcyddLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEVsZW1lbnQgPSB0aGlzLmdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXYudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIHRvdWNoID0gZXZbJ3RhcmdldFRvdWNoZXMnXVswXTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tpbmdDbGljayA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tpbmdDbGlja1N0YXJ0ID0gZXYudGltZVN0YW1wO1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldEVsZW1lbnQgPSB0YXJnZXRFbGVtZW50O1xyXG5cclxuICAgICAgICAgICAgdGhpcy50b3VjaFN0YXJ0WCA9IHRvdWNoLnBhZ2VYO1xyXG4gICAgICAgICAgICB0aGlzLnRvdWNoU3RhcnRZID0gdG91Y2gucGFnZVk7XHJcblxyXG4gICAgICAgICAgICAvKmlmICgoZXYudGltZVN0YW1wIC0gdGhpcy5sYXN0Q2xpY2tUaW1lKSA8IHRoaXMudGFwZGVsYXkpIHtcclxuICAgICAgICAgICAgICAgIC8vICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICB9Ki9cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvblRvdWNoTW92ZShldmVudCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMudHJhY2tpbmdDbGljaykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgZXYgPSBldmVudC5vcmlnaW5hbEV2ZW50O1xyXG4gICAgICAgICAgICAvLyBJZiB0aGUgdG91Y2ggaGFzIG1vdmVkLCBjYW5jZWwgdGhlIGNsaWNrIHRyYWNraW5nXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRhcmdldEVsZW1lbnQgIT09IHRoaXMuZ2V0VGFyZ2V0RWxlbWVudEZyb21FdmVudFRhcmdldChldi50YXJnZXQpIHx8IHRoaXMudG91Y2hIYXNNb3ZlZChldikpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJhY2tpbmdDbGljayA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXRFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uVG91Y2hFbmQoZXZlbnQpIHtcclxuICAgICAgICAgICAgbGV0IGZvckVsZW1lbnQsIG5ld1RyYWNraW5nQ2xpY2tTdGFydCwgdGFyZ2V0VGFnTmFtZSwgc2Nyb2xsUGFyZW50LCB0b3VjaCwgbmV3dGFyZ2V0RWxlbWVudCA9IHRoaXMudGFyZ2V0RWxlbWVudDtcclxuXHJcbiAgICAgICAgICAgIGlmICghdGhpcy50cmFja2luZ0NsaWNrKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBldiA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQ7XHJcbiAgICAgICAgICAgIC8vIFByZXZlbnQgcGhhbnRvbSBjbGlja3Mgb24gZmFzdCBkb3VibGUtdGFwIFxyXG4gICAgICAgICAgICBpZiAoKGV2LnRpbWVTdGFtcCAtIHRoaXMubGFzdENsaWNrVGltZSkgPCB0aGlzLnRhcGRlbGF5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5leHRDbGljayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKChldi50aW1lU3RhbXAgLSB0aGlzLnRyYWNraW5nQ2xpY2tTdGFydCkgPiB0aGlzLnRhcFRpbWVvdXQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBSZXNldCB0byBwcmV2ZW50IHdyb25nIGNsaWNrIGNhbmNlbCBvbiBpbnB1dCBcclxuICAgICAgICAgICAgdGhpcy5jYW5jZWxOZXh0Q2xpY2sgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubGFzdENsaWNrVGltZSA9IGV2ZW50LnRpbWVTdGFtcDtcclxuXHJcbiAgICAgICAgICAgIG5ld1RyYWNraW5nQ2xpY2tTdGFydCA9IHRoaXMudHJhY2tpbmdDbGlja1N0YXJ0O1xyXG4gICAgICAgICAgICB0aGlzLnRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy50cmFja2luZ0NsaWNrU3RhcnQgPSAwO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgIGl0ZW06IGV2ZW50LmN1cnJlbnRUYXJnZXQsXHJcbiAgICAgICAgICAgICAgICByYWlzZUV2ZW50OiB0cnVlXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvblRvdWNoQ2FuY2VsKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tpbmdDbGljayA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldEVsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvbktleURvd24oZXZlbnQpIHtcclxuICAgICAgICAgICAgdmFyIGtleUNvZGUgPSBldmVudC53aGljaCB8fCBldmVudC5rZXlDb2RlO1xyXG5cclxuICAgICAgICAgICAgLy8gQ2hlY2sgY29udHJvbCBrZXlDb2RlXHJcbiAgICAgICAgICAgIGlmIChrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuRU5URVIgfHwga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlNQQUNFKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZW50ZXJTcGFjZUdldHRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW50ZXJTcGFjZUdldHRlcih0aGlzLiRzY29wZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkZXZlbnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGhpcy4kZWxlbWVudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtOiB0aGlzLiRlbGVtZW50LmZpbmQoJy5zZWxlY3RlZCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICBpZiAoa2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkxFRlRfQVJST1cgfHwga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLlJJR0hUX0FSUk9XIHx8XHJcbiAgICAgICAgICAgICAgICBrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuVVBfQVJST1cgfHwga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1dcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gR2V0IG5leHQgc2VsZWN0YWJsZSBjb250cm9sIGluZGV4XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMuJGVsZW1lbnQuZmluZCh0aGlzLmNsYXNzTmFtZSArIHRoaXMubW9kaWZpZXIpLFxyXG4gICAgICAgICAgICAgICAgICAgIGluYyA9IChrZXlDb2RlID09IHRoaXMuJG1kQ29uc3RhbnQuS0VZX0NPREUuUklHSFRfQVJST1cgfHwga2V5Q29kZSA9PSB0aGlzLiRtZENvbnN0YW50LktFWV9DT0RFLkRPV05fQVJST1cpID8gMSA6IC0xLFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1NlbGVjdGVkSW5kZXggPSB0aGlzLnNlbGVjdGVkSW5kZXggKyBpbmM7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gU2V0IG5leHQgY29udHJvbCBhcyBzZWxlY3RlZFxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RJdGVtKHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtSW5kZXg6IG5ld1NlbGVjdGVkSW5kZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXM6IGl0ZW1zLFxyXG4gICAgICAgICAgICAgICAgICAgIHJhaXNlRXZlbnQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9uRm9jdXNJbihldmVudCkge1xyXG4gICAgICAgICAgICAvLyBDaG9vc2Ugc2VsZWN0ZWQgZWxlbWVudFxyXG4gICAgICAgICAgICBsZXQgaXRlbXMsXHJcbiAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW0gPSB0aGlzLiRlbGVtZW50LmZpbmQodGhpcy5jbGFzc05hbWUgKyAnLnNlbGVjdGVkJyk7XHJcblxyXG4gICAgICAgICAgICBzZWxlY3RlZEl0ZW0uYWRkQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIGFyZSBub3Qgc2VsZWN0ZWQgZWxlbWVudHMgdGhlbiBwaWNrIHRoZSBmaXJzdCBvbmVcclxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkSXRlbS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IHRoaXMuaW5kZXhHZXR0ZXIodGhpcy4kc2NvcGUpO1xyXG4gICAgICAgICAgICAgICAgaXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQodGhpcy5jbGFzc05hbWUgKyB0aGlzLm1vZGlmaWVyKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0SXRlbSh7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbUluZGV4OiB0aGlzLnNlbGVjdGVkSW5kZXggfHwgMCxcclxuICAgICAgICAgICAgICAgICAgICBpdGVtczogaXRlbXMsXHJcbiAgICAgICAgICAgICAgICAgICAgcmFpc2VFdmVudDogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb25Gb2N1c091dChldmVudCkge1xyXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LmZpbmQodGhpcy5jbGFzc05hbWUgKyAnLm1kLWZvY3VzZWQnICsgdGhpcy5tb2RpZmllcikucmVtb3ZlQ2xhc3MoJ21kLWZvY3VzZWQnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgU2VsZWN0ZWQgPSBmdW5jdGlvbiAoXHJcbiAgICAgICAgJHBhcnNlOiBuZy5JUGFyc2VTZXJ2aWNlLFxyXG4gICAgICAgICRtZENvbnN0YW50OiBhbnksXHJcbiAgICAgICAgJHRpbWVvdXQ6IG5nLklUaW1lb3V0U2VydmljZVxyXG4gICAgKTogbmcuSURpcmVjdGl2ZSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgc2NvcGU6IGZhbHNlLFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoXHJcbiAgICAgICAgICAgICAgICAkc2NvcGU6IG5nLklTY29wZSxcclxuICAgICAgICAgICAgICAgICRlbGVtZW50OiBKUXVlcnksXHJcbiAgICAgICAgICAgICAgICAkYXR0cnM6IFNlbGVjdGVkQXR0cmlidXRlc1xyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIG5ldyBTZWxlY3RlZExpbmsoJHBhcnNlLCAkbWRDb25zdGFudCwgJHRpbWVvdXQsICRzY29wZSwgJGVsZW1lbnQsICRhdHRycyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoXCJwaXBTZWxlY3RlZFwiLCBbXSlcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBTZWxlY3RlZCcsIFNlbGVjdGVkKTtcclxufSIsImltcG9ydCB7IFNob3J0Y3V0T3B0aW9ucyB9IGZyb20gXCIuL1Nob3J0Y3V0XCI7XHJcblxyXG5leHBvcnQgY2xhc3MgU2hvcnRjdXRJdGVtIHtcclxuICAgIC8vIFNob3J0Y3V0IGNvbWJpbmF0aW9uXHJcbiAgICBwdWJsaWMgc2hvcnRjdXQ6IHN0cmluZztcclxuICAgIC8vIFRhcmdldCBvYmplY3QgXHJcbiAgICBwdWJsaWMgdGFyZ2V0PzogYW55O1xyXG4gICAgLy8gVGFyZ2V0IGVsZW1lbnQgYnkgSWRcclxuICAgIHB1YmxpYyB0YXJnZXRJZD86IHN0cmluZztcclxuICAgIC8vIFRhcmdldCBlbGVtZW50IGJ5IGNsYXNzIChmaXJzdGVsZW1lbnQ/PylcclxuICAgIC8vIFB1YmxpYyB0YXJnZXRDbGFzcz86IHN0cmluZztcclxuICAgIC8vIEFjY2VzcyBmdW5jdGlvblxyXG4gICAgcHVibGljIGFjY2Vzcz86IChldmVudDogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IGJvb2xlYW47XHJcbiAgICAvLyBXaW5kb3cubG9jYXRpb24uaHJlZlxyXG4gICAgcHVibGljIGhyZWY/OiBzdHJpbmc7XHJcbiAgICAvLyAkbG9jYXRpb24udXJsXHJcbiAgICBwdWJsaWMgdXJsPzogc3RyaW5nO1xyXG4gICAgLy8gJHN0YXRlLmdvKHN0YXRlLCBzdGF0ZVBhcmFtcylcclxuICAgIHB1YmxpYyBzdGF0ZT86IHN0cmluZztcclxuICAgIC8vIFBhcmFtZXRlcnMgZm9yICRzdGF0ZS5nbyhzdGF0ZSwgc3RhdGVQYXJhbXMpXHJcbiAgICBwdWJsaWMgc3RhdGVQYXJhbXM/OiBhbnk7XHJcbiAgICAvLyAkcm9vdFNjb3BlLmJyb2FkY2FzdChldmVudClcclxuICAgIHB1YmxpYyBldmVudD86IHN0cmluZztcclxuICAgIC8vIENsaWNrIGNhbGxiYWNrXHJcbiAgICBwdWJsaWMga2V5cHJlc3M/OiAoZXZlbnQ6IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB2b2lkO1xyXG4gICAgLy8gRGVmYXVsdCBvcHRpb25zXHJcbiAgICBwdWJsaWMgb3B0aW9ucz86IFNob3J0Y3V0T3B0aW9uczsgICAgXHJcbn1cclxuXHJcbi8vIGV4cG9ydCBjbGFzcyBTaG9ydGN1dEl0ZW0gZXh0ZW5kcyBTaW1wbGVTaG9ydGN1dEl0ZW0ge1xyXG4vLyAgICAgcHVibGljIHNob3J0Y3V0czogU2ltcGxlU2hvcnRjdXRJdGVtW107XHJcbi8vIH1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dHNDb25maWcge1xyXG4gICAgLy8gR2xvYmFsIHNob3J0Y3V0IFxyXG4gICAgcHVibGljIGdsb2JhbFNob3J0Y3V0czogU2hvcnRjdXRJdGVtW10gPSBbXTtcclxuICAgIC8vIExvY2FsIHNob3J0Y3V0IFxyXG4gICAgcHVibGljIGxvY2FsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXSA9IFtdO1xyXG4gICAgLy8gRGVmYXVsdCBvcHRpb25zXHJcbiAgICBwdWJsaWMgZGVmYXVsdE9wdGlvbnM6IFNob3J0Y3V0T3B0aW9ucyA9IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVNob3J0Y3V0c1NlcnZpY2Uge1xyXG4gICAgcmVhZG9ubHkgY29uZmlnOiBTaG9ydGN1dHNDb25maWc7XHJcblxyXG4gICAgZ2xvYmFsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXTtcclxuICAgIGxvY2FsU2hvcnRjdXRzOiBTaG9ydGN1dEl0ZW1bXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJU2hvcnRjdXRzUHJvdmlkZXIgZXh0ZW5kcyBuZy5JU2VydmljZVByb3ZpZGVyIHtcclxuICAgIGNvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG4gICAgXHJcbiAgICBnbG9iYWxTaG9ydGN1dHM6IFNob3J0Y3V0SXRlbVtdO1xyXG4gICAgZGVmYXVsdE9wdGlvbnM6IFNob3J0Y3V0T3B0aW9ucztcclxufVxyXG4iLCJleHBvcnQgY2xhc3MgS2V5Ym9hcmRFdmVudCB7XHJcbiAgICBzdGF0aWMgS2V5ZG93bjogc3RyaW5nID0gJ2tleWRvd24nO1xyXG4gICAgc3RhdGljIEtleXVwOiBzdHJpbmcgPSAna2V5dXAnO1xyXG4gICAgc3RhdGljIEtleXByZXNzOiBzdHJpbmcgPSAna2V5cHJlc3MnO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2hvcnRjdXRPcHRpb25zIHtcclxuICAgIFR5cGU6IEtleWJvYXJkRXZlbnQ7XHJcbiAgICBQcm9wYWdhdGU6IGJvb2xlYW47XHJcbiAgICBEaXNhYmxlSW5JbnB1dDogYm9vbGVhbjtcclxuICAgIFRhcmdldDogYW55OyAvLyBFdmVudCB0YXJnZXQgb2JqZWN0XHJcbiAgICBLZXljb2RlOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaG9ydGN1dCB7XHJcbiAgICBwcml2YXRlIHNoaWZ0X251bXMgPSB7XHJcbiAgICAgICAgXCJgXCI6IFwiflwiLFxyXG4gICAgICAgIFwiMVwiOiBcIiFcIixcclxuICAgICAgICBcIjJcIjogXCJAXCIsXHJcbiAgICAgICAgXCIzXCI6IFwiI1wiLFxyXG4gICAgICAgIFwiNFwiOiBcIiRcIixcclxuICAgICAgICBcIjVcIjogXCIlXCIsXHJcbiAgICAgICAgXCI2XCI6IFwiXlwiLFxyXG4gICAgICAgIFwiN1wiOiBcIiZcIixcclxuICAgICAgICBcIjhcIjogXCIqXCIsXHJcbiAgICAgICAgXCI5XCI6IFwiKFwiLFxyXG4gICAgICAgIFwiMFwiOiBcIilcIixcclxuICAgICAgICBcIi1cIjogXCJfXCIsXHJcbiAgICAgICAgXCI9XCI6IFwiK1wiLFxyXG4gICAgICAgIFwiO1wiOiBcIjpcIixcclxuICAgICAgICBcIidcIjogXCJcXFwiXCIsXHJcbiAgICAgICAgXCIsXCI6IFwiPFwiLFxyXG4gICAgICAgIFwiLlwiOiBcIj5cIixcclxuICAgICAgICBcIi9cIjogXCI/XCIsXHJcbiAgICAgICAgXCJcXFxcXCI6IFwifFwiXHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgc3BlY2lhbF9rZXlzID0ge1xyXG4gICAgICAgICdlc2MnOiAyNyxcclxuICAgICAgICAnZXNjYXBlJzogMjcsXHJcbiAgICAgICAgJ3RhYic6IDksXHJcbiAgICAgICAgJ3NwYWNlJzogMzIsXHJcbiAgICAgICAgJ3JldHVybic6IDEzLFxyXG4gICAgICAgICdlbnRlcic6IDEzLFxyXG4gICAgICAgICdiYWNrc3BhY2UnOiA4LFxyXG5cclxuICAgICAgICAnc2Nyb2xsbG9jayc6IDE0NSxcclxuICAgICAgICAnc2Nyb2xsX2xvY2snOiAxNDUsXHJcbiAgICAgICAgJ3Njcm9sbCc6IDE0NSxcclxuICAgICAgICAnY2Fwc2xvY2snOiAyMCxcclxuICAgICAgICAnY2Fwc19sb2NrJzogMjAsXHJcbiAgICAgICAgJ2NhcHMnOiAyMCxcclxuICAgICAgICAnbnVtbG9jayc6IDE0NCxcclxuICAgICAgICAnbnVtX2xvY2snOiAxNDQsXHJcbiAgICAgICAgJ251bSc6IDE0NCxcclxuXHJcbiAgICAgICAgJ3BhdXNlJzogMTksXHJcbiAgICAgICAgJ2JyZWFrJzogMTksXHJcblxyXG4gICAgICAgICdpbnNlcnQnOiA0NSxcclxuICAgICAgICAnaG9tZSc6IDM2LFxyXG4gICAgICAgICdkZWxldGUnOiA0NixcclxuICAgICAgICAnZW5kJzogMzUsXHJcblxyXG4gICAgICAgICdwYWdldXAnOiAzMyxcclxuICAgICAgICAncGFnZV91cCc6IDMzLFxyXG4gICAgICAgICdwdSc6IDMzLFxyXG5cclxuICAgICAgICAncGFnZWRvd24nOiAzNCxcclxuICAgICAgICAncGFnZV9kb3duJzogMzQsXHJcbiAgICAgICAgJ3BkJzogMzQsXHJcblxyXG4gICAgICAgICdsZWZ0JzogMzcsXHJcbiAgICAgICAgJ3VwJzogMzgsXHJcbiAgICAgICAgJ3JpZ2h0JzogMzksXHJcbiAgICAgICAgJ2Rvd24nOiA0MCxcclxuXHJcbiAgICAgICAgJ2YxJzogMTEyLFxyXG4gICAgICAgICdmMic6IDExMyxcclxuICAgICAgICAnZjMnOiAxMTQsXHJcbiAgICAgICAgJ2Y0JzogMTE1LFxyXG4gICAgICAgICdmNSc6IDExNixcclxuICAgICAgICAnZjYnOiAxMTcsXHJcbiAgICAgICAgJ2Y3JzogMTE4LFxyXG4gICAgICAgICdmOCc6IDExOSxcclxuICAgICAgICAnZjknOiAxMjAsXHJcbiAgICAgICAgJ2YxMCc6IDEyMSxcclxuICAgICAgICAnZjExJzogMTIyLFxyXG4gICAgICAgICdmMTInOiAxMjNcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBtb2RpZmllcnMgPSB7XHJcbiAgICAgICAgc2hpZnQ6IHsgd2FudGVkOiBmYWxzZSwgcHJlc3NlZDogZmFsc2UgfSxcclxuICAgICAgICBjdHJsOiB7IHdhbnRlZDogZmFsc2UsIHByZXNzZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgYWx0OiB7IHdhbnRlZDogZmFsc2UsIHByZXNzZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgbWV0YTogeyB3YW50ZWQ6IGZhbHNlLCBwcmVzc2VkOiBmYWxzZSB9XHQvLyBNZXRhIGlzIE1hYyBzcGVjaWZpY1xyXG4gICAgfTtcclxuXHJcbiAgICBwdWJsaWMgZXZlbnRDYWxsYmFjazogRnVuY3Rpb247XHJcbiAgICBwdWJsaWMgdGFyZ2V0OiBhbnk7XHJcbiAgICBwdWJsaWMgZXZlbnQ6IEtleWJvYXJkRXZlbnQ7XHJcbiAgICBwdWJsaWMgb3B0aW9uOiBTaG9ydGN1dE9wdGlvbnM7XHJcbiAgICBwdWJsaWMgc2hvcmN1dDogc3RyaW5nO1xyXG4gICAgcHVibGljIGNhbGxiYWNrOiBGdW5jdGlvbjtcclxuXHJcbiAgICBwdWJsaWMgY29uc3RydWN0b3IoXHJcbiAgICAgICAgZWxlbWVudDogYW55LFxyXG4gICAgICAgIHNob3JjdXRDb21iaW5hdGlvbjogc3RyaW5nLFxyXG4gICAgICAgIG9wdGlvbjogU2hvcnRjdXRPcHRpb25zLFxyXG4gICAgICAgIGNhbGxiYWNrOiAoZT86IEpRdWVyeUV2ZW50T2JqZWN0KSA9PiB2b2lkXHJcbiAgICApIHtcclxuICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgIHRoaXMudGFyZ2V0ID0gZWxlbWVudDtcclxuICAgICAgICB0aGlzLnNob3JjdXQgPSBzaG9yY3V0Q29tYmluYXRpb247XHJcbiAgICAgICAgdGhpcy5ldmVudCA9IG9wdGlvbi5UeXBlO1xyXG4gICAgICAgIHRoaXMub3B0aW9uID0gb3B0aW9uO1xyXG4gICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcclxuXHJcbiAgICAgICAgdGhpcy5ldmVudENhbGxiYWNrID0gKGV2ZW50OiBKUXVlcnlFdmVudE9iamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZTogSlF1ZXJ5RXZlbnRPYmplY3QgPSBldmVudCB8fCA8SlF1ZXJ5RXZlbnRPYmplY3Q+d2luZG93LmV2ZW50O1xyXG4gICAgICAgICAgICBsZXQgY29kZTogbnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9uLkRpc2FibGVJbklucHV0KSB7IC8vIERpc2FibGUgc2hvcnRjdXQga2V5cyBpbiBJbnB1dCwgVGV4dGFyZWEgZmllbGRzXHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDtcclxuICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlLnRhcmdldDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5zcmNFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGUuc3JjRWxlbWVudDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5ub2RlVHlwZSA9PSAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnRhZ05hbWUgPT0gJ0lOUFVUJyB8fCBlbGVtZW50LnRhZ05hbWUgPT0gJ1RFWFRBUkVBJykgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIEZpbmQgV2hpY2gga2V5IGlzIHByZXNzZWRcclxuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSkge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IGUua2V5Q29kZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChlLndoaWNoKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gZS53aGljaDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGNoYXJhY3RlciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb2RlID09IDE4OCkgY2hhcmFjdGVyID0gXCIsXCI7IC8vIElmIHRoZSB1c2VyIHByZXNzZXMsIHdoZW4gdGhlIHR5cGUgaXMgb25rZXlkb3duXHJcbiAgICAgICAgICAgIGlmIChjb2RlID09IDE5MCkgY2hhcmFjdGVyID0gXCIuXCI7IC8vIElmIHRoZSB1c2VyIHByZXNzZXMsIHdoZW4gdGhlIHR5cGUgaXMgb25rZXlkb3duXHJcblxyXG4gICAgICAgICAgICBsZXQga2V5czogc3RyaW5nW10gPSB0aGlzLnNob3JjdXQuc3BsaXQoXCIrXCIpO1xyXG4gICAgICAgICAgICAvLyBLZXkgUHJlc3NlZCAtIGNvdW50cyB0aGUgbnVtYmVyIG9mIHZhbGlkIGtleXByZXNzZXMgLSBpZiBpdCBpcyBzYW1lIGFzIHRoZSBudW1iZXIgb2Yga2V5cywgdGhlIHNob3J0Y3V0IGZ1bmN0aW9uIGlzIGludm9rZWRcclxuICAgICAgICAgICAgbGV0IGtwOiBudW1iZXIgPSAwO1xyXG5cclxuICAgICAgICAgICAgaWYgKGUuY3RybEtleSkgdGhpcy5tb2RpZmllcnMuY3RybC5wcmVzc2VkID0gZS5jdHJsS2V5O1xyXG4gICAgICAgICAgICBpZiAoZS5zaGlmdEtleSkgdGhpcy5tb2RpZmllcnMuc2hpZnQucHJlc3NlZCA9IGUuc2hpZnRLZXk7XHJcbiAgICAgICAgICAgIGlmIChlLmFsdEtleSkgdGhpcy5tb2RpZmllcnMuYWx0LnByZXNzZWQgPSBlLmFsdEtleTtcclxuICAgICAgICAgICAgaWYgKGUubWV0YUtleSkgdGhpcy5tb2RpZmllcnMubWV0YS5wcmVzc2VkID0gZS5tZXRhS2V5O1xyXG5cclxuICAgICAgICAgICAgbGV0IGk6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgazogc3RyaW5nID0ga2V5c1tpXTtcclxuICAgICAgICAgICAgICAgIC8vIE1vZGlmaWVyc1xyXG4gICAgICAgICAgICAgICAgaWYgKGsgPT0gJ2N0cmwnIHx8IGsgPT0gJ2NvbnRyb2wnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5jdHJsLndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsgPT0gJ3NoaWZ0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuc2hpZnQud2FudGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoayA9PSAnYWx0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIGtwKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuYWx0LndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsgPT0gJ21ldGEnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGlmaWVycy5tZXRhLndhbnRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGsubGVuZ3RoID4gMSkgeyAvLyBJZiBpdCBpcyBhIHNwZWNpYWwga2V5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3BlY2lhbF9rZXlzW2tdID09IGNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAga3ArKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9uLktleWNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRpb24uS2V5Y29kZSA9PSBjb2RlKSBrcCsrO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gVGhlIHNwZWNpYWwga2V5cyBkaWQgbm90IG1hdGNoXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJhY3RlciA9PSBrKSBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zaGlmdF9udW1zW2NoYXJhY3Rlcl0gJiYgZS5zaGlmdEtleSkgeyAvLyBTdHVwaWQgU2hpZnQga2V5IGJ1ZyBjcmVhdGVkIGJ5IHVzaW5nIGxvd2VyY2FzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhcmFjdGVyID0gdGhpcy5zaGlmdF9udW1zW2NoYXJhY3Rlcl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhcmFjdGVyID09IGspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrcCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoa3AgPT0ga2V5cy5sZW5ndGggJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmN0cmwucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5jdHJsLndhbnRlZCAmJlxyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuc2hpZnQucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5zaGlmdC53YW50ZWQgJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLmFsdC5wcmVzc2VkID09IHRoaXMubW9kaWZpZXJzLmFsdC53YW50ZWQgJiZcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLm1ldGEucHJlc3NlZCA9PSB0aGlzLm1vZGlmaWVycy5tZXRhLndhbnRlZCkge1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2soZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9wdGlvbi5Qcm9wYWdhdGUpIHsgLy8gU3RvcCB0aGUgZXZlbnRcclxuICAgICAgICAgICAgICAgICAgICAvLyBlLmNhbmNlbEJ1YmJsZSBpcyBzdXBwb3J0ZWQgYnkgSUUgLSB0aGlzIHdpbGwga2lsbCB0aGUgYnViYmxpbmcgcHJvY2Vzcy5cclxuICAgICAgICAgICAgICAgICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBlLnN0b3BQcm9wYWdhdGlvbiB3b3JrcyBpbiBGaXJlZm94LlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuY3RybC5wcmVzc2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzLnNoaWZ0LnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMuYWx0LnByZXNzZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5tb2RpZmllcnMubWV0YS5wcmVzc2VkID0gZmFsc2U7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgeyBTaG9ydGN1dCwgU2hvcnRjdXRPcHRpb25zLCBLZXlib2FyZEV2ZW50IH0gZnJvbSBcIi4vU2hvcnRjdXRcIjtcclxuaW1wb3J0IHsgSUtleWJvYXJkU2hvcnRjdXRzLCBJU2hvcnRjdXRCaW5kaW5nU2VydmljZSwgSVNob3J0Y3V0QmluZGluZ1Byb3ZpZGVyIH0gZnJvbSAnLi9JU2hvcnRjdXRCaW5kaW5nU2VydmljZSc7XHJcblxyXG57XHJcbiAgICBjbGFzcyBTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlIGltcGxlbWVudHMgSVNob3J0Y3V0QmluZGluZ1NlcnZpY2Uge1xyXG4gICAgICAgIHByaXZhdGUgX2xvZzogbmcuSUxvZ1NlcnZpY2U7XHJcbiAgICAgICAgcHJpdmF0ZSBfZGVmYXVsdE9wdGlvbjogU2hvcnRjdXRPcHRpb25zO1xyXG4gICAgICAgIHByaXZhdGUgX3Nob3J0Y3V0czogSUtleWJvYXJkU2hvcnRjdXRzID0ge307XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgJGxvZzogbmcuSUxvZ1NlcnZpY2UsXHJcbiAgICAgICAgICAgIG9wdGlvbjogU2hvcnRjdXRPcHRpb25zXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIFwibmdJbmplY3RcIjtcclxuICAgICAgICAgICAgdGhpcy5fbG9nID0gJGxvZztcclxuICAgICAgICAgICAgdGhpcy5fZGVmYXVsdE9wdGlvbiA9IG9wdGlvbiA/IF8uZGVmYXVsdHMob3B0aW9uLCB0aGlzLmdldERlZmF1bHRPcHRpb24oKSkgOiB0aGlzLmdldERlZmF1bHRPcHRpb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgZ2V0RGVmYXVsdE9wdGlvbigpOiBTaG9ydGN1dE9wdGlvbnMge1xyXG4gICAgICAgICAgICBsZXQgZGVmYXVsdE9wdGlvbjogU2hvcnRjdXRPcHRpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgVHlwZTogS2V5Ym9hcmRFdmVudC5LZXlkb3duLFxyXG4gICAgICAgICAgICAgICAgUHJvcGFnYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIERpc2FibGVJbklucHV0OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIFRhcmdldDogZG9jdW1lbnQsXHJcbiAgICAgICAgICAgICAgICBLZXljb2RlOiBudWxsXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZGVmYXVsdE9wdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXQgc2hvcnRjdXRzKCk6IElLZXlib2FyZFNob3J0Y3V0cyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaG9ydGN1dHM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgYWRkKHNob3J0Y3V0OiBzdHJpbmcsIGNhbGxiYWNrOiAoZTogSlF1ZXJ5RXZlbnRPYmplY3QpID0+IHZvaWQsIG9wdGlvbjogU2hvcnRjdXRPcHRpb25zKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKHNob3J0Y3V0KTtcclxuICAgICAgICAgICAgbGV0IHNob3J0Y3V0T3B0aW9uOiBTaG9ydGN1dE9wdGlvbnMgPSBvcHRpb24gPyBfLmRlZmF1bHRzKG9wdGlvbiwgdGhpcy5fZGVmYXVsdE9wdGlvbikgOiB0aGlzLl9kZWZhdWx0T3B0aW9uO1xyXG4gICAgICAgICAgICBsZXQgc2hvcnRjdXRDb21iaW5hdGlvbjogc3RyaW5nID0gc2hvcnRjdXQudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgbGV0IGVsZW1lbnQgPSBzaG9ydGN1dE9wdGlvbi5UYXJnZXQ7XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNob3J0Y3V0T3B0aW9uLlRhcmdldCA9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNob3J0Y3V0T3B0aW9uLlRhcmdldCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gc2hvcnRjdXRPcHRpb24uVGFyZ2V0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2xvZy5lcnJvcignUmVnaXN0ZXIgc2hvcnRjdXQ6IGVsZW1lbnQgdW5kZW50aWZpZWQhJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghc2hvcnRjdXRDb21iaW5hdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbG9nLmVycm9yKCdSZWdpc3RlciBzaG9ydGN1dDogc2hvcnRjdXQgY29tYmluYXRpb24gdW5kZW50aWZpZWQhJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2xvZy5lcnJvcignUmVnaXN0ZXIgc2hvcnRjdXQ6IHNob3JjdXQgY2FsbGJhY2sgdW5kZW50aWZpZWQhJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdLZXlib2FyZFNob3J0Y3V0ID0gbmV3IFNob3J0Y3V0KGVsZW1lbnQsIHNob3J0Y3V0Q29tYmluYXRpb24sIHNob3J0Y3V0T3B0aW9uLCBjYWxsYmFjayk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLl9zaG9ydGN1dHNbc2hvcnRjdXRDb21iaW5hdGlvbl0gPSBuZXdLZXlib2FyZFNob3J0Y3V0O1xyXG5cclxuICAgICAgICAgICAgLy9BdHRhY2ggdGhlIGZ1bmN0aW9uIHdpdGggdGhlIGV2ZW50XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihzaG9ydGN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChlbGVtZW50LmF0dGFjaEV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmF0dGFjaEV2ZW50KCdvbicgKyBzaG9ydGN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2spO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbihzaG9ydGN1dE9wdGlvbi5UeXBlLCBuZXdLZXlib2FyZFNob3J0Y3V0LmV2ZW50Q2FsbGJhY2spO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgcmVtb3ZlKHNob3JjdXQ6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgICAgICBsZXQgc2hvcnRjdXRDb21iaW5hdGlvbiA9IHNob3JjdXQudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgbGV0IGJpbmRpbmc6IFNob3J0Y3V0ID0gdGhpcy5fc2hvcnRjdXRzW3Nob3J0Y3V0Q29tYmluYXRpb25dO1xyXG5cclxuICAgICAgICAgICAgZGVsZXRlKHRoaXMuX3Nob3J0Y3V0c1tzaG9ydGN1dENvbWJpbmF0aW9uXSlcclxuICAgICAgICAgICAgaWYgKCFiaW5kaW5nKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBsZXQgdHlwZSA9IGJpbmRpbmcuZXZlbnQ7XHJcbiAgICAgICAgICAgIGxldCBlbGVtZW50ID0gYmluZGluZy50YXJnZXQ7XHJcbiAgICAgICAgICAgIGxldCBjYWxsYmFjayA9IGJpbmRpbmcuZXZlbnRDYWxsYmFjaztcclxuXHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmRldGFjaEV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmRldGFjaEV2ZW50KCdvbicgKyB0eXBlLCBjYWxsYmFjayk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIGZhbHNlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGVsZW1lbnRbJ29uJyArIHR5cGVdID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9mZih0eXBlLCBjYWxsYmFjayk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgU2hvcnRjdXRCaW5kaW5nUHJvdmlkZXIgaW1wbGVtZW50cyBJU2hvcnRjdXRCaW5kaW5nUHJvdmlkZXIge1xyXG4gICAgICAgIHByaXZhdGUgX3NlcnZpY2U6IFNob3J0Y3V0QmluZGluZ1NlcnZpY2U7XHJcbiAgICAgICAgcHJpdmF0ZSBfb3B0aW9uOiBTaG9ydGN1dE9wdGlvbnM7XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXQgb3B0aW9uKCk6IFNob3J0Y3V0T3B0aW9ucyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0IG9wdGlvbih2YWx1ZTogU2hvcnRjdXRPcHRpb25zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX29wdGlvbiA9IHZhbHVlIHx8IG5ldyBTaG9ydGN1dE9wdGlvbnMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyAkZ2V0KFxyXG4gICAgICAgICAgICAkbG9nOiBuZy5JTG9nU2VydmljZVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBcIm5nSW5qZWN0XCI7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fc2VydmljZSA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fc2VydmljZSA9IG5ldyBTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlKCRsb2csIHRoaXMuX29wdGlvbik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2VydmljZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoJ3BpcFNob3J0Y3V0cycpXHJcbiAgICAgICAgLnByb3ZpZGVyKCdwaXBTaG9ydGN1dEJpbmRpbmcnLCBTaG9ydGN1dEJpbmRpbmdQcm92aWRlcik7XHJcbn0iLCJpbXBvcnQgeyBTaG9ydGN1dE9wdGlvbnMgfSBmcm9tIFwiLi9TaG9ydGN1dFwiO1xyXG5pbXBvcnQgeyBJU2hvcnRjdXRCaW5kaW5nU2VydmljZSB9IGZyb20gXCIuL0lTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlXCI7XHJcblxyXG5pbnRlcmZhY2UgU2hvcnRjdXRBdHRyaWJ1dGVzIGV4dGVuZHMgbmcuSUF0dHJpYnV0ZXMge1xyXG4gICAgcGlwU2hvcnRjdXRBY3Rpb246IGFueTtcclxuICAgIHBpcFNob3J0Y3V0TmFtZTogYW55O1xyXG4gICAgcGlwU2hvcmN1dE9wdGlvbnM6IFNob3J0Y3V0T3B0aW9ucztcclxufVxyXG5cclxuY2xhc3MgU2hvcnRjdXRDb250cm9sbGVyIGltcGxlbWVudHMgbmcuSUNvbnRyb2xsZXIgIHtcclxuICAgIHByaXZhdGUgYWN0aW9uU2hvcnRjdXRzOiBGdW5jdGlvbjtcclxuICAgIHByaXZhdGUgbmFtZVNob3J0Y3V0czogc3RyaW5nO1xyXG4gICAgcHJpdmF0ZSBvcHRpb25zOiBTaG9ydGN1dE9wdGlvbnM7XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgJGVsZW1lbnQ6IEpRdWVyeSxcclxuICAgICAgICAkYXR0cnM6IFNob3J0Y3V0QXR0cmlidXRlcyxcclxuICAgICAgICAkc2NvcGU6IG5nLklTY29wZSxcclxuICAgICAgICAkbG9nOiBuZy5JTG9nU2VydmljZSxcclxuICAgICAgICAkcGFyc2U6IG5nLklQYXJzZVNlcnZpY2UsXHJcbiAgICAgICAgcGlwU2hvcnRjdXRCaW5kaW5nOiBJU2hvcnRjdXRCaW5kaW5nU2VydmljZVxyXG4gICAgKSB7XHJcbiAgICAgICAgXCJuZ0luamVjdFwiO1xyXG5cclxuICAgICAgICBpZiAoJGF0dHJzLnBpcFNob3J0Y3V0QWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzID0gJHBhcnNlKCRhdHRycy5waXBTaG9ydGN1dEFjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzKCRzY29wZSwgeyRldmVudDoge319KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAkbG9nLmVycm9yKCdTaG9ydGN1dCBhY3Rpb24gZG9lcyBub3Qgc2V0LicpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoJGF0dHJzLnBpcFNob3J0Y3V0TmFtZSAmJiBfLmlzU3RyaW5nKCRhdHRycy5waXBTaG9ydGN1dE5hbWUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZVNob3J0Y3V0cyA9ICRhdHRycy5waXBTaG9ydGN1dE5hbWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgJGxvZy5lcnJvcignU2hvcnRjdXQgbmFtZSBkb2VzIG5vdCBzZXQuJyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMub3B0aW9ucyA9ICRhdHRycy5waXBTaG9yY3V0T3B0aW9ucyA/IDxTaG9ydGN1dE9wdGlvbnM+JGF0dHJzLnBpcFNob3JjdXRPcHRpb25zIDogPFNob3J0Y3V0T3B0aW9ucz57fTtcclxuICAgICAgICB0aGlzLm9wdGlvbnMuVGFyZ2V0ID0gJGVsZW1lbnQ7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gUmVnaXN0cmF0aW9uIG9mIGtleWJvcmQgc2hvcnRjdXRzXHJcbiAgICAgICAgcGlwU2hvcnRjdXRCaW5kaW5nLmFkZCh0aGlzLm5hbWVTaG9ydGN1dHMsIChlPzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uU2hvcnRjdXRzKCRzY29wZSwgeyRldmVudDogeydlJzogZX19KTsgICAgICAgICAgXHJcbiAgICAgICAgfSwgdGhpcy5vcHRpb25zKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGtleXByZXNzU2hvcnRjdXQoYWN0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5hY3Rpb25TaG9ydGN1dHMoKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gUHJldmVudCBqdW5rIGZyb20gZ29pbmcgaW50byB0eXBlc2NyaXB0IGRlZmluaXRpb25zXHJcbntcclxuICAgIGNvbnN0IHNob3J0Y3V0c0RpcmVjdGl2ZSA9IGZ1bmN0aW9uKCk6IG5nLklEaXJlY3RpdmUge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIHNjb3BlOiBmYWxzZSwgICAgICAgICAgICBcclxuICAgICAgICAgICAgY29udHJvbGxlcjogU2hvcnRjdXRDb250cm9sbGVyXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyXHJcbiAgICAgICAgLm1vZHVsZSgncGlwU2hvcnRjdXRzJylcclxuICAgICAgICAuZGlyZWN0aXZlKCdwaXBTaG9ydGN1dCcsIHNob3J0Y3V0c0RpcmVjdGl2ZSk7XHJcbn0iLCJpbXBvcnQgeyBJU2hvcnRjdXRCaW5kaW5nU2VydmljZSB9IGZyb20gXCIuL0lTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlXCJcclxuaW1wb3J0IHsgU2hvcnRjdXQsIFNob3J0Y3V0T3B0aW9ucywgS2V5Ym9hcmRFdmVudCB9IGZyb20gXCIuL1Nob3J0Y3V0XCI7XHJcbmltcG9ydCB7IFNob3J0Y3V0c0NvbmZpZywgU2hvcnRjdXRJdGVtLCBJU2hvcnRjdXRzU2VydmljZSwgSVNob3J0Y3V0c1Byb3ZpZGVyIH0gZnJvbSAnLi9JU2hvcnRjdXRzU2VydmljZSc7XHJcblxyXG5leHBvcnQgbGV0IFNob3J0Y3V0c0NoYW5nZWRFdmVudCA9ICdwaXBTaG9ydGN1dHNDaGFuZ2VkJztcclxuXHJcbmNsYXNzIFNob3J0Y3V0c1NlcnZpY2UgaW1wbGVtZW50cyBJU2hvcnRjdXRzU2VydmljZSB7XHJcbiAgICBwcml2YXRlIF9vbGRDb25maWc6IFNob3J0Y3V0c0NvbmZpZztcclxuICAgIHByaXZhdGUgX2NvbmZpZzogU2hvcnRjdXRzQ29uZmlnO1xyXG5cclxuICAgIHB1YmxpYyBjb25zdHJ1Y3RvcihcclxuICAgICAgICBjb25maWc6IFNob3J0Y3V0c0NvbmZpZyxcclxuICAgICAgICBwcml2YXRlICRyb290U2NvcGU6IG5nLklSb290U2NvcGVTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIFxyXG4gICAgICAgIHByaXZhdGUgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLCBcclxuICAgICAgICBwcml2YXRlICRpbmplY3RvcjogbmcuYXV0by5JSW5qZWN0b3JTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgcGlwU2hvcnRjdXRCaW5kaW5nOiBJU2hvcnRjdXRCaW5kaW5nU2VydmljZVxyXG4gICAgKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnID0gY29uZmlnO1xyXG4gICAgICAgIHRoaXMuX29sZENvbmZpZyA9IF8uY2xvbmVEZWVwKHRoaXMuX2NvbmZpZyk7XHJcblxyXG4gICAgICAgIC8vIEFkZCBzaG9ydGN1dHNcclxuICAgICAgICB0aGlzLmFkZFNob3J0Y3V0cyh0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzKTtcclxuICAgICAgICB0aGlzLmFkZFNob3J0Y3V0cyh0aGlzLl9jb25maWcubG9jYWxTaG9ydGN1dHMpOyAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVzY3JpYmUgcHJpdmF0ZSBmdW5jdGlvbnNcclxuICAgIHByaXZhdGUgc2VuZENoYW5nZUV2ZW50KCkge1xyXG4gICAgICAgIC8vIFJlbW92ZSBzaG9ydGN1dHNcclxuICAgICAgICB0aGlzLnJlbW92ZVNob3J0Y3V0cyh0aGlzLl9vbGRDb25maWcuZ2xvYmFsU2hvcnRjdXRzKTtcclxuICAgICAgICB0aGlzLnJlbW92ZVNob3J0Y3V0cyh0aGlzLl9vbGRDb25maWcubG9jYWxTaG9ydGN1dHMpO1xyXG5cclxuICAgICAgICAvLyBBZGQgc2hvcnRjdXRzXHJcbiAgICAgICAgdGhpcy5hZGRTaG9ydGN1dHModGhpcy5jb25maWcuZ2xvYmFsU2hvcnRjdXRzKTtcclxuICAgICAgICB0aGlzLmFkZFNob3J0Y3V0cyh0aGlzLmNvbmZpZy5sb2NhbFNob3J0Y3V0cyk7XHJcblxyXG4gICAgICAgIHRoaXMuJHJvb3RTY29wZS4kZW1pdChTaG9ydGN1dHNDaGFuZ2VkRXZlbnQsIHRoaXMuY29uZmlnKTtcclxuXHJcbiAgICAgICAgLy8gU2F2ZSBjdXJyZW50IGNvbmZpZyB0byBvbGRDb25maWdcclxuICAgICAgICB0aGlzLl9vbGRDb25maWcgPSBfLmNsb25lRGVlcCh0aGlzLmNvbmZpZyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW1vdmVTaG9ydGN1dHMoY29sbGVjdGlvbjogU2hvcnRjdXRJdGVtW10pOiB2b2lkIHtcclxuICAgICAgICBfLmVhY2goY29sbGVjdGlvbiwgKGspID0+IHtcclxuICAgICAgICAgICAgdGhpcy5waXBTaG9ydGN1dEJpbmRpbmcucmVtb3ZlKGsuc2hvcnRjdXQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUga2V5cHJlc3NTaG9ydGN1dChpdGVtOiBTaG9ydGN1dEl0ZW0sIGV2ZW50OiBKUXVlcnlFdmVudE9iamVjdCkge1xyXG4gICAgICAgIGlmIChpdGVtLmFjY2VzcyAmJiBfLmlzRnVuY3Rpb24oaXRlbS5hY2Nlc3MpKSB7XHJcbiAgICAgICAgICAgIGlmICghaXRlbS5hY2Nlc3MoZXZlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IFxyXG5cclxuICAgICAgICBpZiAoaXRlbS5rZXlwcmVzcykge1xyXG4gICAgICAgICAgICBpdGVtLmtleXByZXNzKGV2ZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZW0uaHJlZikge1xyXG4gICAgICAgICAgICB0aGlzLiR3aW5kb3cubG9jYXRpb24uaHJlZiA9IGl0ZW0uaHJlZjtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGl0ZW0udXJsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGxvY2F0aW9uLnVybChpdGVtLnVybCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChpdGVtLnN0YXRlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiRpbmplY3Rvci5oYXMoJyRzdGF0ZScpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgJHN0YXRlID0gdGhpcy4kaW5qZWN0b3IuZ2V0KCckc3RhdGUnKTtcclxuICAgICAgICAgICAgICAgICRzdGF0ZVsnZ28nXShpdGVtLnN0YXRlLCBpdGVtLnN0YXRlUGFyYW1zKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaXRlbS5ldmVudCkge1xyXG4gICAgICAgICAgICB0aGlzLiRyb290U2NvcGUuJGJyb2FkY2FzdChpdGVtLmV2ZW50KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgcmFpc2Ugbm90aWZpY2F0aW9uXHJcbiAgICAgICAgICAgIHRoaXMuJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdwaXBTaG9ydGN1dEtleXByZXNzJywgaXRlbS5zaG9ydGN1dCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYWRkU2hvcnRjdXRzKGNvbGxlY3Rpb246IFNob3J0Y3V0SXRlbVtdKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IGdlbmVyYWxPcHRpb25zOiBTaG9ydGN1dE9wdGlvbnMgPSB0aGlzLmNvbmZpZy5kZWZhdWx0T3B0aW9ucyA/IHRoaXMuY29uZmlnLmRlZmF1bHRPcHRpb25zIDogPFNob3J0Y3V0T3B0aW9ucz57fTtcclxuICAgICAgICBcclxuICAgICAgICBfLmVhY2goY29sbGVjdGlvbiwgKGspID0+IHtcclxuICAgICAgICAgICAgbGV0IG9wdGlvbjogU2hvcnRjdXRPcHRpb25zID0gay5vcHRpb25zID8gay5vcHRpb25zIDogZ2VuZXJhbE9wdGlvbnM7XHJcbiAgICAgICAgICAgIGxldCB0YXJnZXQ6IGFueTtcclxuXHJcbiAgICAgICAgICAgIHRhcmdldCA9IGsudGFyZ2V0ID8gay50YXJnZXQgOiBrLnRhcmdldElkO1xyXG4gICAgICAgICAgICBvcHRpb24uVGFyZ2V0ID0gdGFyZ2V0O1xyXG4gICAgICAgICAgICAvLyBSZWdpc3RyYXRpb24gb2Yga2V5Ym9hcmQgc2hvcnRjdXRcclxuICAgICAgICAgICAgdGhpcy5waXBTaG9ydGN1dEJpbmRpbmcuYWRkKGsuc2hvcnRjdXQsIChlPzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmtleXByZXNzU2hvcnRjdXQoaywgZSk7ICAgICAgICBcclxuICAgICAgICAgICAgfSwgb3B0aW9uKTsgICAgICAgICAgICAgIFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERlc2NyaWJlIHB1YmxpYyBmdW5jdGlvbnMgXHJcbiAgICBwdWJsaWMgZ2V0IGNvbmZpZygpOiBTaG9ydGN1dHNDb25maWcge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWc7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBkZWZhdWx0T3B0aW9ucygpOiBTaG9ydGN1dE9wdGlvbnMge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZGVmYXVsdE9wdGlvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHNldCBkZWZhdWx0T3B0aW9ucyh2YWx1ZTogU2hvcnRjdXRPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmRlZmF1bHRPcHRpb25zID0gdmFsdWUgfHwgbnVsbDtcclxuICAgICAgICB0aGlzLnNlbmRDaGFuZ2VFdmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZ2xvYmFsU2hvcnRjdXRzKCk6IFNob3J0Y3V0SXRlbVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmdsb2JhbFNob3J0Y3V0cztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGdsb2JhbFNob3J0Y3V0cyh2YWx1ZTogU2hvcnRjdXRJdGVtW10pIHtcclxuICAgICAgICB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzID0gdmFsdWUgfHwgW107XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IGxvY2FsU2hvcnRjdXRzKCk6IFNob3J0Y3V0SXRlbVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgbG9jYWxTaG9ydGN1dHModmFsdWU6IFNob3J0Y3V0SXRlbVtdKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnLmxvY2FsU2hvcnRjdXRzID0gdmFsdWUgfHwgW107XHJcbiAgICAgICAgdGhpcy5zZW5kQ2hhbmdlRXZlbnQoKTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgU2hvcnRjdXRzUHJvdmlkZXIgaW1wbGVtZW50cyBJU2hvcnRjdXRzUHJvdmlkZXIge1xyXG4gICAgcHJpdmF0ZSBfY29uZmlnOiBTaG9ydGN1dHNDb25maWcgPSBuZXcgU2hvcnRjdXRzQ29uZmlnKCk7XHJcbiAgICBwcml2YXRlIF9zZXJ2aWNlOiBTaG9ydGN1dHNTZXJ2aWNlO1xyXG5cclxuICAgIHB1YmxpYyBnZXQgY29uZmlnKCk6IFNob3J0Y3V0c0NvbmZpZyB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IGNvbmZpZyh2YWx1ZTogU2hvcnRjdXRzQ29uZmlnKSB7XHJcbiAgICAgICAgdGhpcy5fY29uZmlnID0gdmFsdWUgfHwgbmV3IFNob3J0Y3V0c0NvbmZpZygpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXQgZGVmYXVsdE9wdGlvbnMoKTogU2hvcnRjdXRPcHRpb25zIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmRlZmF1bHRPcHRpb25zO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgZGVmYXVsdE9wdGlvbnModmFsdWU6IFNob3J0Y3V0T3B0aW9ucykge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5kZWZhdWx0T3B0aW9ucyA9IHZhbHVlIHx8IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCBnbG9iYWxTaG9ydGN1dHMoKTogU2hvcnRjdXRJdGVtW10ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jb25maWcuZ2xvYmFsU2hvcnRjdXRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXQgZ2xvYmFsU2hvcnRjdXRzKHZhbHVlOiBTaG9ydGN1dEl0ZW1bXSkge1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZy5nbG9iYWxTaG9ydGN1dHMgPSB2YWx1ZSB8fCBbXTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgJGdldChcclxuICAgICAgICAkcm9vdFNjb3BlOiBuZy5JUm9vdFNjb3BlU2VydmljZSwgXHJcbiAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsIFxyXG4gICAgICAgICRsb2NhdGlvbjogbmcuSUxvY2F0aW9uU2VydmljZSwgXHJcbiAgICAgICAgJGluamVjdG9yOiBuZy5hdXRvLklJbmplY3RvclNlcnZpY2UsXHJcbiAgICAgICAgcGlwU2hvcnRjdXRCaW5kaW5nOiBJU2hvcnRjdXRCaW5kaW5nU2VydmljZVxyXG4gICAgKSB7XHJcbiAgICAgICAgXCJuZ0luamVjdFwiO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fc2VydmljZSA9PSBudWxsKVxyXG4gICAgICAgICAgICB0aGlzLl9zZXJ2aWNlID0gbmV3IFNob3J0Y3V0c1NlcnZpY2UodGhpcy5fY29uZmlnLCAkcm9vdFNjb3BlLCAkd2luZG93LCAkbG9jYXRpb24sICRpbmplY3RvciwgcGlwU2hvcnRjdXRCaW5kaW5nKTtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gdGhpcy5fc2VydmljZTtcclxuICAgIH1cclxufVxyXG5cclxuYW5ndWxhclxyXG4gICAgLm1vZHVsZSgncGlwU2hvcnRjdXRzJylcclxuICAgIC5wcm92aWRlcigncGlwU2hvcnRjdXRzJywgU2hvcnRjdXRzUHJvdmlkZXIpO1xyXG5cclxuIiwiYW5ndWxhci5tb2R1bGUoJ3BpcFNob3J0Y3V0cycsIFsnbmdNYXRlcmlhbCcsICd1aS5yb3V0ZXInXSk7XHJcblxyXG5pbXBvcnQgJy4vU2hvcnRjdXRCaW5kaW5nU2VydmljZSc7XHJcbmltcG9ydCAnLi9TaG9ydGN1dHNTZXJ2aWNlJztcclxuaW1wb3J0ICcuL1Nob3J0Y3V0RGlyZWN0aXZlJztcclxuXHJcbmV4cG9ydCAqIGZyb20gJy4vSVNob3J0Y3V0c1NlcnZpY2UnO1xyXG5leHBvcnQgKiBmcm9tICcuL0lTaG9ydGN1dEJpbmRpbmdTZXJ2aWNlJztcclxuZXhwb3J0ICogZnJvbSAnLi9TaG9ydGN1dHNTZXJ2aWNlJztcclxuZXhwb3J0ICogZnJvbSAnLi9TaG9ydGN1dEJpbmRpbmdTZXJ2aWNlJzsiLCJ7XHJcbiAgICBpbnRlcmZhY2UgVW5zYXZlZENoYW5nZXNTY29wZSBleHRlbmRzIG5nLklTY29wZSB7XHJcbiAgICAgICAgdW5zYXZlZENoYW5nZXNBdmFpbGFibGU6IEZ1bmN0aW9uO1xyXG4gICAgICAgIHVuc2F2ZWRDaGFuZ2VzTWVzc2FnZTogc3RyaW5nO1xyXG4gICAgICAgIGNhbmNlbExlYXZlOiBGdW5jdGlvbjtcclxuICAgICAgICBhZnRlckxlYXZlOiBGdW5jdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBVbnNhdmVkQ2hhbmdlc0xpbmsge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICAkc2NvcGU6IFVuc2F2ZWRDaGFuZ2VzU2NvcGUsXHJcbiAgICAgICAgICAgICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICR3aW5kb3cub25iZWZvcmV1bmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzQXZhaWxhYmxlKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzTWVzc2FnZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHVuYmluZEZ1bmMgPSAkc2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS51bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZSgpICYmICEkd2luZG93LmNvbmZpcm0oJHNjb3BlLnVuc2F2ZWRDaGFuZ2VzTWVzc2FnZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oJHNjb3BlLmNhbmNlbExlYXZlKSAmJiAkc2NvcGUuY2FuY2VsTGVhdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oJHNjb3BlLmFmdGVyTGVhdmUpICYmICRzY29wZS5hZnRlckxlYXZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAkd2luZG93Lm9uYmVmb3JldW5sb2FkID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHVuYmluZEZ1bmMoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IFVuc2F2ZWRDaGFuZ2VzID0gZnVuY3Rpb24gKCR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBRScsXHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICB1bnNhdmVkQ2hhbmdlc0F2YWlsYWJsZTogJyZwaXBVbnNhdmVkQ2hhbmdlc0F2YWlsYWJsZScsXHJcbiAgICAgICAgICAgICAgICB1bnNhdmVkQ2hhbmdlc01lc3NhZ2U6ICdAcGlwVW5zYXZlZENoYW5nZXNNZXNzYWdlJyxcclxuICAgICAgICAgICAgICAgIGFmdGVyTGVhdmU6ICcmcGlwVW5zYXZlZENoYW5nZXNBZnRlckxlYXZlJyxcclxuICAgICAgICAgICAgICAgIGNhbmNlbExlYXZlOiAnJnBpcFVuc2F2ZWRDaGFuZ2VzQ2FuY2VsTGVhdmUnXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uICgkc2NvcGU6IFVuc2F2ZWRDaGFuZ2VzU2NvcGUpIHtcclxuICAgICAgICAgICAgICAgIG5ldyBVbnNhdmVkQ2hhbmdlc0xpbmsoJHNjb3BlLCAkd2luZG93KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhclxyXG4gICAgICAgIC5tb2R1bGUoXCJwaXBVbnNhdmVkQ2hhbmdlc1wiLCBbXSlcclxuICAgICAgICAuZGlyZWN0aXZlKFwicGlwVW5zYXZlZENoYW5nZXNcIiwgVW5zYXZlZENoYW5nZXMpO1xyXG59Il19