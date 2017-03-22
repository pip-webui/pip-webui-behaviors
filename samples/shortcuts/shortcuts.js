/* global angular */

(function () {
    'use strict';

    var thisModule = angular.module('appBehaviors.Shortcuts', ['pipShortcuts']);

    var globalShorcuts = [{
                shortcut: 'ctrl+1',
                state: 'focused'
            },
            {
                shortcut: 'ctrl+2',
                state: 'selected'
            }
        ],
        localShortcuts = [{
                shortcut: 'ctrl+3',
                url: '/draggable'
            },
            {
                shortcut: 'ctrl+m',
                keypress: () => {
                    console.log('!!!!!!!!!!! pressed ctrl+m');
                }
            }
        ];

    thisModule.config(function (pipShortcutsProvider) {
        pipShortcutsProvider.globalShortcuts = globalShorcuts;
        pipShortcutsProvider.localShortcuts = localShortcuts;
    });

    thisModule.controller('ShortcutsController',
        function ($scope, $timeout, $mdToast, pipShortcutBinding, pipShortcuts) {
            let textareaShortcut = 'shift+q';
            let documentShortcut = 'shift+alt+t';
            let documentShortcut1 = 'alt+t';
            let textareaOptions = {
                Target: 'textarea_shortcut'
            };

            pipShortcutBinding.add(textareaShortcut, (e) => {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Pressed shift + Q in first textarea')
                        .position('bottom')
                        .hideDelay(3000)
                );
                
            }, textareaOptions);

            pipShortcutBinding.add(documentShortcut, (e) => {
                console.log('shift+alt+t', e);
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Pressed shift+alt+t in document')
                        .position('bottom')
                        .hideDelay(3000)
                );
            });
            pipShortcutBinding.add(documentShortcut1, (e) => {
                console.log('alt+t', e);
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Pressed alt+t in document')
                        .position('bottom')
                        .hideDelay(3000)
                );
            });

            $scope.keyEvent = function ($event) {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Pressed alt + V in second textarea')
                        .position('bottom')
                        .hideDelay(3000)
                );
            }
        }
    );

})();