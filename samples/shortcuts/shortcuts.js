/* global angular */

(function () {
    'use strict';

    var thisModule = angular.module('appBehaviors.Shortcuts', ['pipShortcuts']);

    var globalShorcuts = [
                { shortcut: 'ctrl+1', state: 'focused' },
                { shortcut: 'ctrl+2', state: 'selected' }
            ],
        localShortcuts = [
                { shortcut: 'ctrl+3', url: '/draggable' },
                { shortcut: 'ctrl+m', 
                    keypress: () => {
                        console.log('!!!!!!!!!!! pressed ctrl+m');
                    } 
                }
            ];

    thisModule.config(function (pipShortcutsProvider) {
            pipShortcutsProvider.globalShortcuts = globalShorcuts;
            pipShortcutsProvider.localShortcuts = localShortcuts;
        } 
    );

    thisModule.controller('ShortcutsController',
        function($scope, $timeout, pipShortcutsRegister, pipShortcuts) {
            let textareaShortcut = 'shift+q';
            let documentShortcut = 'alt+g';
            let textareaOptions = { Target: 'textarea_shortcut' };


            pipShortcutsRegister.add(textareaShortcut, (e) => {
                console.log('textareaShortcut11111111111111111111111111', e);
            }, textareaOptions);

            pipShortcutsRegister.add(documentShortcut, (e) => {
                console.log('documentShortcut22222222222222222222', e);
            });

            // pipShortcuts.on(globalShorcuts, []);

            $scope.keyEvent = function ($event) {
                console.log('ctrl+v pressed into textarea', $event); 
            }
        }
    );

})();
