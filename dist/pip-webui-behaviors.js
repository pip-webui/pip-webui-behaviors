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
Object.defineProperty(exports, "__esModule", { value: true });
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
Object.defineProperty(exports, "__esModule", { value: true });
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
Object.defineProperty(exports, "__esModule", { value: true });
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
Object.defineProperty(exports, "__esModule", { value: true });
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
Object.defineProperty(exports, "__esModule", { value: true });
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
Object.defineProperty(exports, "__esModule", { value: true });
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
Object.defineProperty(exports, "__esModule", { value: true });
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
Object.defineProperty(exports, "__esModule", { value: true });
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
Object.defineProperty(exports, "__esModule", { value: true });
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
Object.defineProperty(exports, "__esModule", { value: true });
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
Object.defineProperty(exports, "__esModule", { value: true });
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

//# sourceMappingURL=pip-webui-behaviors.js.map
