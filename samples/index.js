/* global angular */

(function () {
    'use strict';

    var content = [
        { title: 'Focused', state: 'focused', url: '/focused', controller: 'FocusedController', templateUrl: 'focused/focused.html' },
        { title: 'Selected', state: 'selected', url: '/selected', controller: 'SelectedController', templateUrl: 'selected/selected.html' },
        { title: 'Infinite Scroll', state: 'infinite_scroll', url: '/infinite_scroll', controller: 'InfiniteScrollController', templateUrl: 'infinite_scroll/infinite_scroll.html' },
        { title: 'Draggable', state: 'draggable', url: '/draggable', controller: 'DraggableController', templateUrl: 'draggable_sample/draggable.html' },
        { title: 'Draggable Input', state: 'draggable_input', url: '/draggable_input', controller: 'DraggableInputController', templateUrl: 'draggable_sample/draggable_input.html' },
        { title: 'Unsaved Changes', state: 'unsaved_changes', url: '/unsaved_changes', controller: 'UnsavedChangesController', templateUrl: 'unsaved_changes_sample/unsaved_changes.html' },
        { title: 'Freeze Scroll', state: 'freeze_scroll', url: '/freeze_scroll', controller: 'FreezeScrollController', templateUrl: 'freeze_scroll_sample/freeze_scroll.html' }
    ];

    var thisModule = angular.module('appBehaviors',
        [
            // 3rd Party Modules
            'ui.router', 'ui.utils', 'ngResource', 'ngAria', 'ngCookies', 'ngSanitize', 'ngMessages',
            'ngMaterial', 'wu.masonry', 'LocalStorageModule', 

            'pipBehaviors',
            'appBehaviors.Focused',
            'appBehaviors.Selected', 
            'appBehaviors.InfiniteScroll', 
            'appBehaviors.UnsavedChanges',
            'appBehaviors.DraggableInput',
            'appBehaviors.Draggable',
            'appBehaviors.UnsavedChanges',
            'appBehaviors.FreezeScroll',

            'pipFreeze'
        ]
    );

    thisModule.config(function ($stateProvider, $urlRouterProvider, $mdThemingProvider, $mdIconProvider, 
                $compileProvider, $httpProvider) {

            $mdIconProvider.iconSet('icons', '../../lib/images/icons.svg', 512);

            $compileProvider.debugInfoEnabled(false);
            $httpProvider.useApplyAsync(true);

            var contentItem, i;

            $mdIconProvider.iconSet('icons', 'images/icons.svg', 512);

            for (i = 0; i < content.length; i++) {
                contentItem = content[i];
                $stateProvider.state(contentItem.state, contentItem);
            }

            $urlRouterProvider.otherwise('/Focused');
        } 
    );

    thisModule.controller('pipSampleController', 
        function ($scope, $rootScope, $state, $mdSidenav, $mdTheming, $injector, $mdMedia, localStorageService) {

            var pipTranslate = $injector.has('pipTranslate') ? $injector.get('pipTranslate') : null,
                pipTheme = $injector.has('pipTheme') ? $injector.get('pipTheme') : null;

            $scope.isTranslated = !!pipTranslate;
            $scope.isTheme = !!pipTheme;
            $scope.$mdMedia = $mdMedia;

            $rootScope.$theme = localStorageService.get('theme') || 'blue';
            if ($scope.isTheme) {
                $scope.themes = _.keys(_.omit($mdTheming.THEMES, 'default'));
            } else {
                $scope.themes = [];
            }
            

            $scope.languages = ['en', 'ru'];
            if (!$rootScope.$language) {
                $rootScope.$language = 'en';
            }

            $scope.content = content;
            $scope.menuOpened = false;

            // Update page after language changed
            $rootScope.$on('languageChanged', function(event) {
                $state.reload();
            });

            // Update page after theme changed
            $rootScope.$on('themeChanged', function(event) {
                $state.reload();
            });

            $scope.onSwitchPage = function (state) {
                $mdSidenav('left').close();
                $state.go(state);
            };

            $scope.onThemeClick = function(theme) {
                if ($scope.isTheme) {
                    setTimeout(function () {
                        pipTheme.use(theme, false, false);
                        $rootScope.$theme = theme;
                        $rootScope.$apply();
                    }, 0);                      
                }
            };

            $scope.onToggleMenu = function () {
                $mdSidenav('left').toggle();
            };

            $scope.onLanguageClick = function(language) {
                if (pipTranslate) {
                    setTimeout(function () {
                        pipTranslate.use(language);
                        $rootScope.$apply();
                    }, 0);   
                } 
             
            };

            $scope.isActiveState = function (state) {
                return $state.current.name == state;
            };            

        }
    );

})();
