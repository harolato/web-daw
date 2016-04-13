/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
angular.module('keyboard',[])
/*
directive   : keyboard
desc        : Directive displays keyboard. When key is clicked controller sends signal to instrument to play a note.

 */
.directive('keyboard',['$compile', '$window','$rootScope','keyboardHelperService',function($compile, $window, $rootScope,keyboardHelperService){
    return {
        restrict : 'E',
        scope : {
            // Starting octave
            octave : '=',
            // number of octaves to display
            octaves : '='
        },
        link : function ($scope,element) {
            var vm = $scope;
            // Available notes
            vm.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            // Array for processed list of notes
            vm.notesGenerated = [];
            // Add n number of octaves
            for ( var  o = 0 ; o < vm.octaves ; o++ ) {
                vm.notesGenerated = vm.notesGenerated.concat(vm.notes);
            };
            // Add octave numbers
            var octaveCounter = vm.octave;
            vm.notesGenerated.forEach(function(v, i){
                vm.notesGenerated[i] += octaveCounter;
                if ( (i+1) % 12 == 0 && i != 0 ) {
                    octaveCounter++;
                }
            });
            // Colour whites and black keys
            vm.getClass = function ( note ) {
                return {
                    black : (vm.notesGenerated[note].split('#')[1]),
                    white : (!vm.notesGenerated[note].split('#')[1]),
                    key : true
                };
            };

            // Define callbacks
            vm.keyDown = function (note, freq) {
                // Find a device which is using keyboard
                var device = keyboardHelperService.getKeyboardUser();
                // Send note signal to instrument associated with that device
                device.instrument_instance.play(freq, device._id);
            };
            vm.keyUp = function (note, freq) {
                var device = keyboardHelperService.getKeyboardUser();
                device.instrument_instance.stop(freq);
            };

            // Define interaction events
            element.on('mousedown', function (e) {
                keyboardHelperService.mousedown(e, vm.keyDown);
            });
            element.on('mouseup', function(e){
                keyboardHelperService.mouseup(e, vm.keyUp);
            });

        },
        templateUrl : 'app/components/keyboard/view.html'
    }
}]).service('keyboardHelperService', [function(){
    return {
        // Calculate frequency of a note
        getFrequencyOfNote : function (note) {
            var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
            var key_number;
            var octave;

            if ( note.length === 3 ) {
                octave = note.charAt(2);
            } else {
                octave = note.charAt(1);
            }
            key_number = notes.indexOf( note.slice(0, -1) );

            if (key_number < 3) {
                key_number = key_number + 12 + ((octave - 1) * 12) + 1;
            } else {
                key_number = key_number + ((octave - 1) * 12) + 1;
            }

            return 440 * Math.pow(2, (key_number - 49) / 12);
        },
        keyboardUser : null,
        mousedown : function (e, callback) {
            var el = angular.element(e.target);
            var note = el.data().$scope.note;
            el.addClass("active");
            callback(note, this.getFrequencyOfNote(note));
        },
        mouseup : function (e, callback) {
            var el = angular.element(e.target);
            el.removeClass("active");
            var note = el.data().$scope.note;
            callback(note, this.getFrequencyOfNote(note));
        },
        setKeyboardUser : function (device) {
            this.keyboardUser = device;
        },
        getKeyboardUser : function () {
            return this.keyboardUser;
        }
    }
}]);