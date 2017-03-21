import { IDraggableService } from './DraggableService';

{
    interface IDragLinkScope extends ng.IScope {
        value: any;
    }

    interface IDragLinkAttributes extends ng.IAttributes {
        ngDrag: any;
        pipDragStart: any;
        pipDragStop: any;
        pipDragSuccess: any;
        allowTransform: any;
        pipDragData: any;
        pipVerticalScroll: any;
        pipHorizontalScroll: any;
        pipActivationDistance: any;
        pipScrollContainer: any;
        pipDrag: any;
        pipCenterAnchor: any;
    }

    class DragLink {
        private LONG_PRESS: number = 50; // 50ms for longpress
        private offset: any;
        private _centerAnchor: boolean = false;
        private _mx: number;
        private _my: number;
        private _tx: number;
        private _ty: number;
        private _mrx: number;
        private _mry: number;
        private _hasTouch: boolean = ('ontouchstart' in window) || ( < any > window).DocumentTouch; // && document instanceof DocumentTouch; // DocumentTouch is not defined!
        private _pressEvents: string = 'touchstart mousedown';
        private _moveEvents: string = 'touchmove mousemove';
        private _releaseEvents: string = 'touchend mouseup';
        private _dragHandle: any;

        // to identify the element in order to prevent getting superflous events when a single element has both drag and drop directives on it.
        private _myid: string | number;
        private _data: any = null;

        private _dragOffset: any = null;

        private _dragEnabled: boolean = false;

        private _pressTimer: any = null;

        private _elementStyle: any = {};

        private onDragStartCallback: Function;
        private onDragStopCallback: Function;
        private onDragSuccessCallback: Function;
        private allowTransform: boolean;

        private getDragData: any;
        private verticalScroll: boolean;
        private horizontalScroll: boolean;
        private activationDistance: number;
        private scrollDistance: number;
        private scrollParent: boolean = false;

        private scrollContainer: JQuery = angular.element(window);
        private scrollContainerGetter: any;

        // deregistration function for mouse move events in $rootScope triggered by jqLite trigger handler
        private _deregisterRootMoveListener: Function = angular.noop;

        constructor(
            private $rootScope: ng.IRootScopeService,
            private $parse: ng.IParseService,
            private $document: ng.IDocumentService,
            private $window: ng.IWindowService,
            private pipDraggable: IDraggableService,
            private $scope: IDragLinkScope,
            private $element: JQuery,
            private $attrs: IDragLinkAttributes
        ) {
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

        private initialize() {
            this.$element.attr('pip-draggable', 'false'); // prevent native drag
            // check to see if drag handle(s) was specified
            // if querySelectorAll is available, we use this instead of find
            // as JQLite find is limited to tagnames
            let dragHandles: any;
            if (this.$element[0].querySelectorAll) {
                dragHandles = angular.element(this.$element[0].querySelectorAll('[pip-drag-handle]'));
            } else {
                dragHandles = this.$element.find('[pip-drag-handle]');
            }
            if (dragHandles.length) {
                this._dragHandle = dragHandles;
            }
            this.toggleListeners(true);

            // Initialize scroll container
            if (this.scrollParent) {
                this.scrollContainer = angular.element(this.$element.parent());
            } else if (this.$attrs.pipScrollContainer) {
                this.scrollContainer = angular.element(this.scrollContainerGetter(this.$scope));
            } else {
                this.scrollContainer = angular.element(window);
            }
        }

        private toggleListeners(enable) {
            if (!enable) return;
            // add listeners.

            this.$scope.$on('$destroy', () => {
                this.onDestroy(enable);
            });
            this.$scope.$watch(this.$attrs.pipDrag, (newVal, oldVal) => {
                this.onEnableChange(newVal, oldVal);
            });
            this.$scope.$watch(this.$attrs.pipCenterAnchor, (newVal, oldVal) => {
                this.onCenterAnchor(newVal, oldVal);
            });
            // wire up touch events
            if (this._dragHandle) {
                // handle(s) specified, use those to initiate drag
                this._dragHandle.on(this._pressEvents, (event) => {
                    this.onpress(event);
                });
            } else {
                // no handle(s) specified, use the element as the handle
                this.$element.on(this._pressEvents, (event) => {
                    this.onpress(event);
                });
            }
            if (!this._hasTouch && this.$element[0].nodeName.toLowerCase() == "img") {
                this.$element.on('mousedown', () => {
                    return false;
                }); // prevent native drag for images
            }
        }

        private onDestroy(enable) {
            this.toggleListeners(false);
        }

        private onEnableChange(newVal, oldVal) {
            this._dragEnabled = (newVal);
        }

        private onCenterAnchor(newVal, oldVal) {
            if (angular.isDefined(newVal))
                this._centerAnchor = (newVal || 'true');
        }

        private isClickableElement(evt) {
            return (
                angular.isDefined(angular.element(evt.target).attr("pip-cancel-drag"))
            );
        }

        /*
         * When the element is clicked start the drag behaviour
         * On touch devices as a small delay so as not to prevent native window scrolling
         */
        private onpress(evt) {
            if (!this._dragEnabled) return;

            if (this.isClickableElement(evt)) {
                return;
            }

            if (evt.type == "mousedown" && evt.button != 0) {
                // Do not start dragging on right-click
                return;
            }

            this.saveElementStyles();

            if (this._hasTouch) {
                this.cancelPress();
                this._pressTimer = setTimeout(() => {
                    this.cancelPress();
                    this.onlongpress(evt);
                }, this.LONG_PRESS);
                this.$document.on(this._moveEvents, () => {
                    this.cancelPress();
                });
                this.$document.on(this._releaseEvents, () => {
                    this.cancelPress();
                });
            } else {
                this.onlongpress(evt);
            }
        }

        private saveElementStyles() {
            this._elementStyle.left = this.$element.css('css') || 0;
            this._elementStyle.top = this.$element.css('top') || 0;
            this._elementStyle.position = this.$element.css('position');
            this._elementStyle.width = this.$element.css('width');
        }

        private cancelPress() {
            clearTimeout(this._pressTimer);
            this.$document.off(this._moveEvents, () => {
                this.cancelPress();
            });
            this.$document.off(this._releaseEvents, () => {
                this.cancelPress();
            });
        }

        private onlongpress(evt) {
            if (!this._dragEnabled) return;
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


            ( < any > this.$element).centerX = this.$element[0].offsetWidth / 2;
            ( < any > this.$element).centerY = this.$element[0].offsetHeight / 2;

            this._mx = this.pipDraggable.inputEvent(evt).pageX;
            this._my = this.pipDraggable.inputEvent(evt).pageY;
            this._mrx = this._mx - this.offset.left;
            this._mry = this._my - this.offset.top;
            if (this._centerAnchor) {
                this._tx = this._mx - ( < any > this.$element).centerX - this.$window.pageXOffset;
                this._ty = this._my - ( < any > this.$element).centerY - this.$window.pageYOffset;
            } else {
                this._tx = this._mx - this._mrx - this.$window.pageXOffset;
                this._ty = this._my - this._mry - this.$window.pageYOffset;
            }

            this.$document.on(this._moveEvents, (event) => {
                this.onmove(event);
            });
            this.$document.on(this._releaseEvents, (event) => {
                this.onrelease(event);
            });
            // This event is used to receive manually triggered mouse move events
            // jqLite unfortunately only supports triggerHandler(...)
            // See http://api.jquery.com/triggerHandler/
            // _deregisterRootMoveListener = $rootScope.$on('draggable:_triggerHandlerMove', onmove);
            this._deregisterRootMoveListener = this.$rootScope.$on('draggable:_triggerHandlerMove', (event, origEvent) => {
                this.onmove(origEvent);
            });
        }

        private onmove(evt) {
            if (!this._dragEnabled) return;
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
                    this.$scope.$apply(() => {
                        this.onDragStartCallback(this.$scope, {
                            $data: this._data,
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
                this._tx = this._mx - ( < any > this.$element).centerX - this._dragOffset.left;
                this._ty = this._my - ( < any > this.$element).centerY - this._dragOffset.top;
            } else {
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
        }

        private onrelease(evt) {
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
                this.$scope.$apply(() => {
                    this.onDragStopCallback(this.$scope, {
                        $data: this._data,
                        $event: evt
                    });
                });
            }

            this._deregisterRootMoveListener();
        }

        private onDragComplete(evt) {
            if (!this.onDragSuccessCallback) return;

            this.$scope.$apply(() => {
                this.onDragSuccessCallback(this.$scope, {
                    $data: this._data,
                    $event: evt
                });
            });
        }

        private reset() {
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
        }

        private moveElement(x, y) {
            const eWidth = this.$element.css('width');
            if (this.allowTransform) {
                this.$element.css({
                    transform: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ' + x + ', ' + y + ', 0, 1)',
                    'z-index': 99999,
                    '-webkit-transform': 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ' + x + ', ' + y + ', 0, 1)',
                    '-ms-transform': 'matrix(1, 0, 0, 1, ' + x + ', ' + y + ')'
                });
            } else {
                this.$element.css({
                    'left': x + 'px',
                    'top': y + 'px',
                    'position': 'fixed',
                    'z-index': 100,
                    width: eWidth
                });
            }
        }

        private dragToScroll() {
            let scrollX = 0,
                scrollY = 0,
                offset = (element) => {
                    return element.offset() || {
                        left: 0,
                        top: 0
                    };
                };

            if (this.horizontalScroll) {
                const
                    containerLeft = offset(this.scrollContainer).left,
                    containerWidth = this.scrollContainer.innerWidth(),
                    containerRight = containerLeft + containerWidth;

                if ((this._mx - containerLeft) < this.activationDistance) {
                    scrollX = -this.scrollDistance;
                } else if ((containerRight - this._mx) < this.activationDistance) {
                    scrollX = this.scrollDistance;
                }
            }

            if (this.verticalScroll) {
                const
                    containerTop = offset(this.scrollContainer).top,
                    containerHeight = this.scrollContainer.innerHeight(),
                    containerBottom = containerTop + containerHeight;

                if ((this._my - containerTop) < this.activationDistance) {
                    scrollY = -this.scrollDistance + 30;
                } else if ((containerBottom - this._my) < this.activationDistance) {
                    scrollY = this.scrollDistance - 30;
                }
            }
            if (scrollX !== 0 || scrollY !== 0) {
                const
                    containerScrollLeft = this.scrollContainer.scrollLeft(),
                    containerScrollTop = this.scrollContainer.scrollTop();

                this.scrollContainer.scrollLeft(containerScrollLeft + scrollX);
                this.scrollContainer.scrollTop(containerScrollTop + scrollY);
            }

        }

    }

    const Drag = function (
        $rootScope: ng.IRootScopeService,
        $parse: ng.IParseService,
        $document: ng.IDocumentService,
        $window: ng.IWindowService,
        pipDraggable: IDraggableService,
    ): ng.IDirective {
        return {
            restrict: 'A',
            link: function (
                $scope: IDragLinkScope,
                $element: JQuery,
                $attrs: IDragLinkAttributes
            ) {
                new DragLink($rootScope, $parse, $document, $window, pipDraggable, $scope, $element, $attrs);
            }
        }
    }

    angular
        .module("pipDraggable")
        .directive('pipDrag', Drag);
}