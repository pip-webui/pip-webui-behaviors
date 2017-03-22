/* global angular */

(function () {
    'use strict';

    var thisModule = angular.module('appBehaviors.Focused', []);

    thisModule.controller('FocusedController',
        function($scope, $interval, $timeout) {
            $timeout(() => {
                $($('[pip-focused]').get(0)).find('.pip-focusable').get(0).focus();
            }, 100);

            $scope.collection = [
                { 
                    id: 1,
                    text: '1'
                },
                { 
                    id: 2,
                    text: '2'
                },
                { 
                    id: 3,
                    text: '4'
                },                                
            ];  
        }
    );

})();
