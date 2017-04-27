import {
    IDraggableService
} from './DraggableService';

{
    interface IDropLinkScope extends ng.IScope {
        value: any;
        isTouching: any;
    }

    interface IDropLinkAttributes extends ng.IAttributes {
        pipDrop: any;
        pipDropSuccess: any;
        pipDragStart: any;
        pipDragStop: any;
        pipDragMove: any;
        pipEnter: any;
        pipLeave: any;
        pipDiactive: any;
    }

    class DropLink {

        private _lastDropTouch: any;
        private _myid: number | string;
        private _dropEnabled: boolean;

        private onDropCallback: Function; // || function(){};
        private onDragStartCallback: Function;
        private onDragStopCallback: Function;
        private onDragMoveCallback: Function;
        private onEnterCallback: Function;
        private onLeaveCallback: Function;
        private onDiactiveCallback: Function;

        constructor(
            private $parse: ng.IParseService,
            private $document: ng.IDocumentService,
            private $timeout: ng.ITimeoutService,
            private pipDraggable: IDraggableService,
            private $scope: IDropLinkScope,
            private $element: JQuery,
            private $attrs: IDropLinkAttributes
        ) {
            $scope.value = $attrs.pipDrop;
            $scope.isTouching = false;

            this._myid = $scope.$id;
            this.onDropCallback = $parse($attrs.pipDropSuccess); // || function(){};
            this.onDragStartCallback = $parse($attrs.pipDragStart);
            this.onDragStopCallback = $parse($attrs.pipDragStop);
            this.onDragMoveCallback = $parse($attrs.pipDragMove);
            this.onEnterCallback = $parse($attrs.pipEnter);
            this.onLeaveCallback = $parse($attrs.pipLeave);
            this.onDiactiveCallback = $parse($attrs.pipDiactive);

            this.initialize();
        }

        private initialize() {
            this.toggleListeners(true);
        }

        private toggleListeners(enable) {
            // remove listeners
            if (!enable) return;
            // add listeners.
            this.$scope.$watch(this.$attrs.pipDrop, (newVal, oldVal) => {
                this.onEnableChange(newVal, oldVal);
            });
            this.$scope.$on('$destroy', (event) => {
                this.onDestroy(event);
            });
            this.$scope.$on('draggable:start', (evt, obj) => {
                this.onDragStart(evt, obj);
            });
            this.$scope.$on('draggable:move', (evt, obj) => {
                this.onDragMove(evt, obj);
            });
            this.$scope.$on('draggable:end', (evt, obj) => {
                this.onDragEnd(evt, obj);
            });
        }

        private onDestroy(enable) {
            this.toggleListeners(false);
        }

        private onEnableChange(newVal, oldVal) {
            this._dropEnabled = newVal;
        }

        private onDragStart(evt, obj) {
            if (!this._dropEnabled) return;
            this.isTouching(obj.x, obj.y, obj.element, evt, obj);

            if (this.$attrs.pipDragStart) {
                this.$timeout(() => {
                    this.onDragStartCallback(this.$scope, {
                        $data: obj.data,
                        $event: obj
                    });
                });
            }
        }

        private onDragMove(evt, obj) {
            if (!this._dropEnabled) return;
            this.isTouching(obj.x, obj.y, obj.element, evt, obj);

            if (this.$attrs.pipDragMove) {
                this.$timeout(() => {
                    this.onDragMoveCallback(this.$scope, {
                        $data: obj.data,
                        $event: obj
                    });
                });
            }
        }

        private onDragEnd(evt, obj) {
            // don't listen to drop events if this is the element being dragged
            // only update the styles and return
            if (!this._dropEnabled) {
                this.updateDragStyles(false, obj.element);
                return;
            }

            if (this.isTouching(obj.x, obj.y, obj.element, evt, obj)) {
                // call the pipDraggable pipDragSuccess element callback
                if (obj.callback) {
                    obj.callback(obj);
                }

                if (this.$attrs.pipDropSuccess) {
                    this.$timeout(() => {
                        this.onDropCallback(this.$scope, {
                            $data: obj.data,
                            $event: obj,
                            $target: this.$scope.$eval(this.$scope.value)
                        });
                    });
                }

                if (this.$attrs.pipDiactive) {
                    this.$timeout(() => {
                        this.onDiactiveCallback(this.$scope, {
                            $data: obj.data,
                            $event: obj,
                            $target: this.$scope.$eval(this.$scope.value)
                        });
                    });
                }
            }

            if (this.$attrs.pipDragStop) {
                this.$timeout(() => {
                    this.onDragStopCallback(this.$scope, {
                        $data: obj.data,
                        $event: obj
                    });
                });
            }

            this.updateDragStyles(false, obj.element);
        }

        private isTouching(mouseX, mouseY, dragElement, evt, obj) {
            const touching = this.hitTest(mouseX, mouseY);
            if (touching !== this.$scope.isTouching) {
                if (touching) {
                    this.onEnterCallback(this.$scope, {
                        $data: obj.data,
                        $event: obj,
                        $target: this.$scope.$eval(this.$scope.value)
                    });
                } else {
                    this.onLeaveCallback(this.$scope, {
                        $data: obj.data,
                        $event: obj,
                        $target: this.$scope.$eval(this.$scope.value)
                    });
                }
            }

            this.$scope.isTouching = touching;
            if (touching) {
                this._lastDropTouch = this.$element;
            }
            this.updateDragStyles(touching, dragElement);
            return touching;
        }

        private updateDragStyles(touching, dragElement) {
            if (touching) {
                this.$element.addClass('pip-drag-enter');
                dragElement.addClass('pip-drag-over');
            } else if (this._lastDropTouch == this.$element) {
                this._lastDropTouch = null;
                this.$element.removeClass('pip-drag-enter');
                dragElement.removeClass('pip-drag-over');
            }
        };

        private hitTest(x, y) {
            const bounds = this.$element[0].getBoundingClientRect();
            x -= this.$document[0].body.scrollLeft + this.$document[0].documentElement.scrollLeft;
            y -= this.$document[0].body.scrollTop + this.$document[0].documentElement.scrollTop;
            return x >= bounds.left &&
                x <= bounds.right &&
                y <= bounds.bottom &&
                y >= bounds.top;
        }
    }

    const Drop = function (
        $parse: ng.IParseService,
        $document: ng.IDocumentService,
        $timeout: ng.ITimeoutService,
        pipDraggable: IDraggableService,
    ): ng.IDirective {
        return {
            restrict: 'A',
            link: function (
                $scope: IDropLinkScope,
                $element: JQuery,
                $attrs: IDropLinkAttributes
            ) {
                new DropLink($parse, $document, $timeout, pipDraggable, $scope, $element, $attrs);
            }
        }
    }

    angular
        .module("pipDraggable")
        .directive('pipDrop', Drop);
}