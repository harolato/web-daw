angular.module('Sequencer',['Devices', 'keyboard']).
controller('sequencerController', [function(){
    //var vm = $scope;
}])
.service('sequencerService', ['devicesService', 'keyboardHelperService','$timeout','$interval', 'sequencerWorkerService','audioCtx', function(devices, keyboard, $timeout, $interval, worker, ctx){
    this.devices = devices.getAll();
    var BPM = 120;
    var beatLen = 60/BPM;

    var playOsc = function (start, end, freq) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        var freq = keyboard.getFrequencyOfNote(freq);
        osc.frequency.value = freq;

        osc.start(start);
        osc.stop(end);
    };

    this.play = function () {
        var earliest = 9999;
        this.devices.forEach(function(device){
            var device = device;
            if ( device.enabled ) {
                device.notes.forEach(function(note){
                    var start = note.start.split('.');
                    var end = note.end.split('.');
                    var noteStartTime =
                        ( start[0] * beatLen) +
                        ( start[2] * (beatLen/4) ) +
                        ( start[1] * ( (beatLen/4) / 4 ) );
                    if ( noteStartTime < earliest ) {
                        earliest = noteStartTime;
                    }
                    var noteEndTime =
                        ( end[0] * beatLen) +
                        ( end[2] * (beatLen/4) ) +
                        ( end[1] * ( (beatLen/4) / 4 ) );
                    playOsc(noteStartTime, noteEndTime, note.note);
                    console.log([
                        {
                            start   : noteStartTime,
                            end     : noteEndTime,
                            note    : note.note
                        }
                    ]);
                });
            }
        });
        console.log(earliest);
    }

}])
.service('sequencerWorkerService', [function () {
    var SequencerWorker = function (  ) {
        this.worker = new Worker('app/components/sequencer/sequencerWorker.js');
        this.worker.onerror = function (e) {
            console.log(e);
        }
        this.worker.onmessage = function (e) {
            console.log(e);
        };
        this.worker.postMessage({"interval": 100});
    };
    SequencerWorker.prototype.stop = function () {
        this.worker.postMessage("stop");
    };
    SequencerWorker.prototype.start = function () {
        this.worker.postMessage("start");
    };
    SequencerWorker.prototype.changeInterval = function ( lookaheadTime ) {
        this.worker.postMessage({"interval" : lookaheadTime});
    }

    return new SequencerWorker();
}]);