/* global angular */

(function () {
    'use strict';

    var thisModule = angular.module('appBehaviors.UnsavedChanges', []);

    thisModule.controller('UnsavedChangesController',
        function($scope, $injector) {

            var pipTranslate = $injector.has('pipTranslate') ? $injector.get('pipTranslate') : null;

            if (pipTranslate) {
                pipTranslate.translations('en', {
                    MESSAGE: 'All changes will be lost!',
                    TRY: 'Try to leave page',
                    TEXT: 'Message content',
                    AVAILABLE: 'Available',
                    LEAVE: 'Leave page!',
                    LINK: 'External link'
                });
                pipTranslate.translations('ru', {
                    MESSAGE: 'Все изменения будут утеряны!',
                    TRY: 'Попробуйте покинуть страницу',
                    TEXT: 'Содержание сообщения',
                    AVAILABLE: 'Включен',
                    LEAVE: 'Покинуть страницу!',
                    LINK: 'Внешняя ссылка'
                });
                $scope.mesage = pipTranslate.translate('MESSAGE');
                $scope.try = pipTranslate.translate('TRY');
                $scope.text = pipTranslate.translate('TEXT');
                $scope.available = pipTranslate.translate('AVAILABLE');
                $scope.leave = pipTranslate.translate('LEAVE');
                $scope.link = pipTranslate.translate('LINK');                
            } else {
                $scope.mesage = 'All changes will be lost!';
                $scope.try = 'Try to leave page';
                $scope.text = 'Message content';
                $scope.available = 'Available';
                $scope.leave = 'Leave page!';
                $scope.link = 'External link';                  
            }

            $scope.onLeavePage = function () {
                window.history.back();
            };

            $scope.available = true;
            $scope.message = 'MESSAGE';

            $scope.isAvailable = function () {
                return $scope.available;
            }
        }
    );

})();
