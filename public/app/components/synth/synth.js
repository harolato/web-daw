/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('synth', []).
directive('synth', function ($compile, audioCtx, masterGain, frequencyFilter) {
    return {
        restrict : "E",
        scope : {
            shit : '='
        },
        require: '^device',
        templateUrl : 'app/components/synth/view.html',
        //link : function (a, b, c, d) {
        //},
        controller : function ($scope, $element) {
            var vm = $scope;
            console.log(vm.shit);
            vm.audioCtx = audioCtx;
            vm.playing = false;
            vm.gainNode = vm.audioCtx.createGain();
            vm.gain = 0.5;
            vm.type = "sine";
            vm.params = {
                output : masterGain
            };
            vm.gainNode.connect(vm.params.output);
            vm.out = 0;
            vm.changeOutput = function () {
                vm.gainNode.disconnect();
                if ( vm.out == 1 ) {
                    vm.params.output = masterGain
                } else {
                    vm.params.output = frequencyFilter.filter
                }
                vm.gainNode.connect(vm.params.output);
            };
            vm.changeType = function () {
                vm.oscillatorNode.type = vm.type;
            };
            vm.changeVolume = function() {
                vm.gainNode.gain.value = vm.gain;
            }
            vm.gainNode.gain.value = vm.gain;
            keyboard.keyDown = function (note, freq) {
                vm.play(freq);
            }
            keyboard.keyUp = function (note, freq) {
                vm.stop(freq);
            }
            vm.chords = [];

            vm.play = function(freq) {

                oscillatorNode = vm.audioCtx.createOscillator();

                oscillatorNode.connect(vm.gainNode);

                oscillatorNode.frequency.value = freq;
                oscillatorNode.type = vm.type;


                oscillatorNode.start(0);
                vm.chords.push(oscillatorNode);
            }

            vm.stop = function(frequency) {
                var new_chords = [];
                for ( var i = 0 ; i < vm.chords.length ; i++ ) {
                    if ( Math.round(vm.chords[i].frequency.value) === Math.round(frequency) ) {
                        vm.chords[i].stop(0);
                        vm.chords[i].disconnect();
                    } else {
                        new_chords.push(vm.chords[i]);
                    }
                }
                vm.chords = new_chords;
            }

            vm.toggleStart = function(){
                if ( !vm.playing ) {
                    vm.play();
                } else {
                    vm.stop();
                }
                vm.playing = !vm.playing;
            };
        }

    }
});