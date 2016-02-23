angular.module('Sequencer',['Devices', 'keyboard']).
controller('sequencerController', [function(){
    //var vm = $scope;
}])
.service('sequencerService', ['devicesService', 'keyboardHelperService','$timeout','$interval', 'sequencerWorkerService','audioCtx', function(devices, keyboard, $timeout, $interval, worker, ctx){
    this.devices = devices.getAll();

    var BPM = 10;
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

    var sortNotes = function (a, b) {

        var astart  = breakNoteCoordinates(a.start);
        var bstart  = breakNoteCoordinates(b.start);

        if ( astart['bar'] > bstart['bar'] ) {
            return 1;
        } else if ( astart['bar'] == bstart['bar'] ) {
            if ( astart['quarter'] == bstart['quarter'] ) {
                if ( astart['eighth'] == bstart['eighth'] ) {
                    return 0;
                } else if ( astart['eighth'] > bstart['eighth'] ) {
                    return 1;
                } else {
                    return -1;
                }
            } else if ( astart['quarter'] > bstart['quarter'] ) {
                return 1;
            } else {
                return -1;
            }
        } else {
            return -1
        }
    };

    var breakNoteCoordinates = function (coords) {
        var brake = coords.split(".");
        return {
            bar     : parseInt(brake[0]*1),
            quarter : parseInt(brake[2]*1),
            eighth  : parseInt(brake[1]*1)
        };
    };

    var noteLength = function ( type ) {
        switch ( type ) {
            case "bar"      : return beatLen;
            case "quarter"  : return beatLen/4;
            case "eighth"   : return ((beatLen/4)/4);
            default: return false;
        }
    };

    var calculateNoteTiming = function (note) {
        var start = breakNoteCoordinates(note.start);
        var end = breakNoteCoordinates(note.end);

        var noteStartTime =
            ( start['bar'] * noteLength("bar")) +
            ( start['quarter'] * noteLength("quarter") ) +
            ( start['eighth'] * noteLength("eighth") );
        var noteEndTime =
            ( end['bar'] * noteLength("bar")) +
            ( end['quarter'] * noteLength("quarter") ) +
            ( end['eighth'] * noteLength("eighth") );
        return {
            start  : noteStartTime,
            end    : noteEndTime
        };
    };

    var nextNote = function () {

    };



    this.play = function () {
        var allTracks = [];
        this.devices.forEach(function(device){
            var device = device;
            if ( device.enabled ) {
                //device.notes.sort(sortNotes);
                //console.log(device.notes);
                allTracks = allTracks.concat(device.notes);

                //console.log({
                //    "Starts at:" : calculateNoteTiming(device.notes[0]),
                //    "Ends at:" : calculateNoteTiming(device.notes[device.notes.length-1])
                //});

                //device.notes.forEach(function(note){
                //
                //    var timing = calculateNoteTiming(note);
                //
                //    playOsc(timing.start, timing.end, note.note);
                //    //console.log([
                //    //    {
                //    //        start   : timing.start,
                //    //        end     : timing.end,
                //    //        note    : note.note
                //    //    }
                //    //]);
                //});
            }
        });


        allTracks.sort(sortNotes);
        allTracks.forEach(function( note ){
            var timing = calculateNoteTiming(note);
            //console.log(note.target);
            note.target.instrument_instance.play(timing.start, timing.end,note.velocity, keyboard.getFrequencyOfNote(note.note));
        });
        //console.log(allTracks);

    };
    this.stop = function (){
        var ap = AudioParam.cancelScheduledValues(ctx.currentTime);
    }

}])
.service('sequencerWorkerService', [function () {
    var SequencerWorker = function (  ) {
        this.worker = new Worker('app/components/sequencer/sequencerWorker.js');
        this.worker.onerror = function (e) {
            console.log(e);
        };
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
}])
.service('notesFactory', [function() {
    return {

    }
}]);