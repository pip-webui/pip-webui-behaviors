

(function () {
    'use strict';

    var thisModule = angular.module("pipFreeze", []);

    thisModule.directive('pipFreeze',function () {
        return {
            restrict: 'A',
            scope: false,
            link: function ($scope, $element, $attrs) {
               if ($scope.$last){
                    window.alert("im the last!");
               }
            }
        };
    });

})();

