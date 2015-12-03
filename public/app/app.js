angular.module('waw', []).
    controller('mainController',['$scope', '$rootScope',  function($scope, $rootScope){
        var parent = $rootScope;
        var vm = this;
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        parent.audioContext = new AudioContext();
        vm.message = "WAW";
    }]).
    controller('synthController', ['$scope', '$rootScope', function($scope, $rootScope){
        var vm = this;
        vm.message = 'lol';
        vm.playing = false;
        vm.audioCtx = $rootScope.audioContext;
        vm.gainNode = vm.audioCtx.createGain();
        vm.gain = 0.5;
        vm.type = "sine";
        vm.freq1 = 400;
        vm.freq2 = 500;
        vm.freq3 = 300;
        vm.changeType = function () {
            vm.oscillatorNode.type = vm.type;
            vm.oscillatorNode2.type = vm.type;
            vm.oscillatorNode3.type = vm.type;
        };

        vm.changeFreq = function (id) {
            switch (id) {
                case 1 : vm.oscillatorNode.frequency.value = vm.freq1;break;
                case 2 : vm.oscillatorNode2.frequency.value = vm.freq2;break;
                case 3 : vm.oscillatorNode3.frequency.value = vm.freq3;break;
                default: alert('error');
            }
        }
        vm.changeVolume = function() {
            vm.gainNode.gain.value = vm.gain;
        }
        vm.gainNode.gain.value = vm.gain;
        vm.play = function() {

            vm.oscillatorNode = vm.audioCtx.createOscillator();
            vm.oscillatorNode2 = vm.audioCtx.createOscillator();
            vm.oscillatorNode3 = vm.audioCtx.createOscillator();

            var finish = vm.audioCtx.destination;
            vm.oscillatorNode.connect(vm.gainNode);
            vm.oscillatorNode2.connect(vm.gainNode);
            vm.oscillatorNode3.connect(vm.gainNode);
            vm.gainNode.connect(finish);

            vm.oscillatorNode.frequency.value = vm.freq1;
            vm.oscillatorNode.type = vm.type;

            vm.oscillatorNode2.frequency.value = vm.freq2;
            vm.oscillatorNode2.type = vm.type;

            vm.oscillatorNode3.frequency.value = vm.freq3;
            vm.oscillatorNode3.type = vm.type;


            vm.oscillatorNode.start(0);
            vm.oscillatorNode2.start(0);
            vm.oscillatorNode3.start(0);
        }

        vm.stop = function() {
            vm.oscillatorNode3.stop(0);
            vm.oscillatorNode2.stop(0);
            vm.oscillatorNode.stop(0);
        }

        vm.toggleStart = function(){
            if ( !vm.playing ) {
                vm.play();
            } else {
                vm.stop();
            }
            vm.playing = !vm.playing;
        };
    }]).
    controller('instrumentController', function ($scope, $rootScope) {
        vm = this;
        vm.name = "Instr";
        vm.nameChange = true;
        vm.changeName = function () {
            vm.nameChange = !vm.nameChange;
        }

    });
