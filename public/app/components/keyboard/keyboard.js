/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('keyboard',[]).directive('keyboard',['$compile', '$window','$rootScope','keyboardHelperService',function($compile, $window, $rootScope,keyboardHelperService){


    return {
        restrict : 'E',
        scope : {
            octave : '=',
            octaves : '='
        },
        link : function ($scope,element) {
            var vm = $scope;
            vm.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            vm.notesGenerated = [];
            //console.log(vm.octaves);
            //vm.notes.forEach(function(v){
            for ( var  o = 0 ; o < vm.octaves ; o++ ) {
                //vm.notes[i] = v + o;
                //console.log(v + "" + o);
                vm.notesGenerated = vm.notesGenerated.concat(vm.notes);
            };
            var octaveCounter = vm.octave;
            vm.notesGenerated.forEach(function(v, i){
                vm.notesGenerated[i] += octaveCounter;
                console.log((i+1) % 12)
                if ( (i+1) % 12 == 0 && i != 0 ) {
                    octaveCounter++;
                }
            });
            //});

            //vm.notesGenerated.sort(function (a, b) {
            //    var aNote = (a.split('#')[1]) ? a.split('#')[0]: a.split("")[0];
            //    var aOctave = (a.split('#')[1]) ? a.split('#')[1]: a.split("")[1];
            //    var aHash = (a.split('#')[1]) ? aNote + "#" : aNote;
            //    var bNote = (b.split('#')[1]) ? b.split('#')[0]: b.split("")[0];
            //    var bOctave = (b.split('#')[1]) ? b.split('#')[1]: b.split("")[1];
            //    var bHash = (b.split('#')[1]) ? bNote + "#" : bNote;
            //
            //    if ( aOctave > bOctave ) {
            //        if ( vm.notes.indexOf(aHash) > vm.notes.indexOf(bHash) ) {
            //            return 1;
            //        }
            //    } else if ( a === b) {
            //        return 0;
            //    } else {
            //        if ( vm.notes.indexOf(aHash) > vm.notes.indexOf(bHash) ) {
            //            return 1;
            //        }
            //    }
            //    return -1;
            //});
            console.log(vm.notesGenerated);
            vm.getClass = function ( note ) {
                //console.log([ vm.notes[note], ]);
                return {
                    black : (vm.notesGenerated[note].split('#')[1]),
                    white : (!vm.notesGenerated[note].split('#')[1]),
                    key : true
                };
            };
            //$rootScope.$on('keyDown', function(e){
            //    console.log(e);
            //});
            //angular.element($window).on('keyUp', function(){
            //
            //});
            vm.activeNotes = [];

            vm.keyDown = function (note, freq) {
                var device = keyboardHelperService.getKeyboardUser();
                device.instrument_instance.play(freq);
            };
            vm.keyUp = function (note, freq) {
                var device = keyboardHelperService.getKeyboardUser();
                device.instrument_instance.stop(freq);
            };

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
    var listeners = [];
    var mouse_is_down = false,
        keysDown = {},
        key_map = {
            65: 'Cl',
            87: 'C#l',
            83: 'Dl',
            69: 'D#l',
            68: 'El',
            70: 'Fl',
            84: 'F#l',
            71: 'Gl',
            89: 'G#l',
            90: 'G#l',
            72: 'Al',
            85: 'A#l',
            74: 'Bl',
            75: 'Cu',
            79: 'C#u',
            76: 'Du',
            80: 'D#u',
            59: 'Eu',
            186: 'Eu',
            222: 'Fu',
            221: 'F#u',
            220: 'Gu'
        };
    return {
        getFrequencyOfNote : function (note) {
            var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
                key_number,
                octave;

            if (note.length === 3) {
                octave = note.charAt(2);
            } else {
                octave = note.charAt(1);
            }
            key_number = notes.indexOf(note.slice(0, -1));

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
            callback(note, this.getFrequencyOfNote(note));
        },
        mouseup : function (e, callback) {
            var el = angular.element(e.target);
            var note = el.data().$scope.note;
            callback(note, this.getFrequencyOfNote(note));
        },
        register : function (cb) {
            listeners.push(cb);
        },
        setKeyboardUser : function (device) {
            this.keyboardUser = device;
        },
        getKeyboardUser : function () {
            return this.keyboardUser;
        }
    }
}]);