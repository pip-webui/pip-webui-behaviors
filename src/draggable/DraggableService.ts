import {
    IDraggableService
} from './IDraggableService';

{
    class DraggableService implements IDraggableService {
        public inputEvent(event) {
            if (angular.isDefined(event.touches)) {
                return event.touches[0];
            }
            //Checking both is not redundent. If only check if touches isDefined, angularjs isDefnied will return error and stop the remaining scripty if event.originalEvent is not defined.
            else if (angular.isDefined(event.originalEvent) && angular.isDefined(event.originalEvent.touches)) {
                return event.originalEvent.touches[0];
            }
            return event;
        };
    }

    angular.module("pipDraggable")
        .service('pipDraggable', DraggableService);
}