angular.module('Sequencer',['Devices', 'keyboard']).
controller('sequencerController', [function(){
    //var vm = $scope;
}])
.factory('sequencerService', ['devicesService', 'keyboardHelperService','$timeout','$interval', 'sequencerWorkerService','audioCtx','$q', function(devices, keyboard, $timeout, $interval, worker, ctx, $q){
    var Scheduler = function () {
        this.BPM = 60;
        this.beatLen = 60/this.BPM; // 60 seconds multiplied by BPM
        this.devices = devices.getAll();
        this.nextNoteIndex = 0;
        this.allTracks = [];
        this.lookahead = 0.02; // seconds
        this.interval = 25; // milliseconds
        this.nextNoteTime;
        this.promise = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.startTime = null;

        this.init();
    };

    Scheduler.prototype.getTracks = function () {
            var defered = $q.defer();
            var tmp = [];
            // Fetch all tracks
            defered.notify("about to update tracks");
            this.devices.forEach(function(device) {
                if (device.enabled){
                // Save to temporary array for comparison
                    tmp = tmp.concat(device.notes);
                }
            });
            // compare new track to current one
            var unique = tmp.concat(this.allTracks).filter(function() {
                var seen = {};
                return function(element, index, array) {
                    return !( element.start+element.end+element.note in seen) && (seen[element.start+element.end+element.note] = 1);
                };
            }());
            // If no changes found terminate function
            //console.log([unique.length, this.allTracks.length, tmp]);

            if ( unique.length == this.allTracks.length ) {
                defered.resolve({message : "no changes found"});
            } else {
                // otherwise update track list
                console.log("please wait...");
                this.allTracks = angular.copy(tmp);
                //this.allTracks.sort(sortNotes);
                defered.resolve({message : "Sort complete"});
            }
        return defered.promise;
    };

    Scheduler.prototype.play = function (stop) {

        if ( stop ) {
            worker.stop();
            this.isPlaying = false;
            return false;
        }
        var updateTracks = this.getTracks();
        var self = this;
        updateTracks.then(function(res){
            //console.log(self.calculateNoteTiming(self.allTracks[self.allTracks.length-1]));
            console.log(res.message);
            self.isPlaying = !self.isPlaying;
            if ( self.isPlaying ) {
                worker.start();
                self.nextNoteTime = self.calculateNoteTiming(self.allTracks[self.nextNoteIndex]).time.start + ctx.currentTime;

                console.log(self.nextNoteTime, ctx.currentTime);
                //self.startTime =
            } else {
                worker.stop();
                //console.log(self.devices);
                self.devices.forEach(function(d){
                    //console.log(d.instrument_instance);
                    d.instrument_instance.stopAll();
                });
                self.startTime = null;
            }
        });
    };

    Scheduler.prototype.getCurrentTime = function () {
        return this.currentTime;
    }

    Scheduler.prototype.init = function () {
        var self = this;
        worker.worker.onmessage = function (e) {
            if ( e.data == "tick" ) {
                self.schedule();
            } else {
                console.log({"message" : e.data});
            }
        };
        worker.worker.postMessage({"interval" : this.interval});
    };

    Scheduler.prototype.scheduleNote = function ( note ) {
        var device = devices.get(note.target);
        device.instrument_instance.play(this.nextNoteTime, this.nextNoteTime + note.time.end,note.velocity, keyboard.getFrequencyOfNote(note.note));
        console.log("scheduleNote()",this.nextNoteTime);

        //this.nextNoteIndex++;
    };

    Scheduler.prototype.nextNote = function(returnNote){
        //var ct = ctx.currentTime;
        //if ( this.nextNoteIndex >= this.allTracks.length ) return false;
        //var next = this.calculateNoteTiming(this.allTracks[this.nextNoteIndex]);
        //if ( returnNote ){
        //    next.time.end += ct;
        //    next.time.start += ct
        //    return next;
        //}
        //
        //var lookahead = ct + this.lookahead;
        //if ( ( next.time.start  < lookahead) && this.nextNoteIndex < this.allTracks.length ) {
        //    console.log(true,(next.time.start+ct), lookahead, this.startTime);
        //    return true;
        //} else {
        //    console.log(false,(next.time.start+ct), lookahead);
        //    return false;
        //
        //}
        this.nextNoteIndex++;
        var nn = this.calculateNoteTiming(this.allTracks[this.nextNoteIndex]);
        var pn = this.calculateNoteTiming(this.allTracks[this.nextNoteIndex-1]);
        this.nextNoteTime += nn.time.start - pn.time.start;
        console.log('nextNote()',this.nextNoteTime, this.nextNoteIndex, nn,pn);
    };

    Scheduler.prototype.increaseTimer = function(){
        var deferred = new $q.defer();
        this.currentTime += this.interval;
        deferred.resolve("done");
        return deferred.promise;
    };

    Scheduler.prototype.schedule = function () {
        console.log("schedulin");

        //var updateTracks = this.getTracks();
        //updateTracks.then(function (r){
        var self = this;
        this.increaseTimer().then(function(){
            self.getCurrentTime();
        });
        //console.log(this.currentTime);
            while ( this.nextNoteTime < ctx.currentTime + this.lookahead && this.nextNoteIndex < this.allTracks.length ) {

                console.log("loopin");
                //console.log(ctx.currentTime);
                this.scheduleNote(this.calculateNoteTiming(this.allTracks[this.nextNoteIndex]));
                this.nextNote();
                //if ( this.nextNoteIndex >= this.allTracks.length ) this.play(true);
            }
        if ( this.nextNoteIndex >= this.allTracks.length ) {
            this.play(true);
            this.nextNoteIndex = 0;
            this.currentTime = 0;
        };
        //});
    };
    var sortNotes = function (a, b) {

        var astart  = breakNoteCoordinates(a.start);
        var bstart  = breakNoteCoordinates(b.start);

        if ( astart['bar'] > bstart['bar'] ) {
            return 1;
        } else if ( astart['bar'] == bstart['bar'] ) {
            if ( astart['beat'] == bstart['beat'] ) {
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
            return -1;
        }
    };

    var breakNoteCoordinates = function (coords) {
        var brake = coords.split(".");
        //console.log(brake);
        return {
            bar    : parseInt(brake[0]),
            beat    : parseInt(brake[2]),
            eighth  : parseInt(brake[1])
        };
    };

    Scheduler.prototype.noteLength = function ( type ) {
        switch ( type ) {
            case "bar"      : return this.beatLen*4; // Length of a bar (4 quarter notes)
            case "beat"  : return this.beatLen; // Length of a beat  (1 quarter note)
            case "eighth"   : return (this.beatLen/2); // Length of a sixteenth note ( 1/8 of a quarter note)
            default: return false;
        }
    };

    Scheduler.prototype.calculateNoteTiming = function (note) {
        var start = breakNoteCoordinates(note.start);
        var end = breakNoteCoordinates(note.end);
    //console.log(start,end);
        var noteStartTime =
            ( start.bar * this.noteLength("bar")) +
            ( start.beat * this.noteLength("beat") ) +
            ( start.eighth * this.noteLength("eighth") );
        var noteEndTime =
            ( end.bar * this.noteLength("bar")) +
            ( end.beat * this.noteLength("beat") ) +
            ( end.eighth * this.noteLength("eighth") );
        note.time = {
            start  : noteStartTime,
            end    : noteEndTime
        };
        return note;
    };
    return {
        getScheduler : function () {
            return new Scheduler();
        }
    };

    //var play = function () {
    //
    //    this.devices.forEach(function(device){
    //        var device = device;
    //        if ( device.enabled ) {
    //            //device.notes.sort(sortNotes);
    //            //console.log(device.notes);
    //            allTracks = allTracks.concat(device.notes);
    //
    //            //console.log({
    //            //    "Starts at:" : calculateNoteTiming(device.notes[0]),
    //            //    "Ends at:" : calculateNoteTiming(device.notes[device.notes.length-1])
    //            //});
    //
    //            //device.notes.forEach(function(note){
    //            //
    //            //    var timing = calculateNoteTiming(note);
    //            //
    //            //    playOsc(timing.start, timing.end, note.note);
    //            //    //console.log([
    //            //    //    {
    //            //    //        start   : timing.start,
    //            //    //        end     : timing.end,
    //            //    //        note    : note.note
    //            //    //    }
    //            //    //]);
    //            //});
    //        }
    //    });
    //
    //
    //    allTracks.sort(sortNotes);
    //    allTracks.forEach(function( note ){
    //        var timing = calculateNoteTiming(note);
    //        //console.log(note.target);
    //        note.target.instrument_instance.play(timing.start, timing.end,note.velocity, keyboard.getFrequencyOfNote(note.note));
    //    });
    //    //console.log(allTracks);
    //
    //};
    //this.stop = function (){
    //    var ap = AudioParam.cancelScheduledValues(ctx.currentTime);
    //}

}])
.service('sequencerWorkerService', [function () {
    var SequencerWorker = function (  ) {
        this.worker = new Worker('app/components/sequencer/sequencerWorker.js');
    };
    SequencerWorker.prototype.stop = function () {
        this.worker.postMessage("stop");
    };
    SequencerWorker.prototype.start = function () {
        this.worker.postMessage("start");
    };
    SequencerWorker.prototype.changeInterval = function ( lookaheadTime ) {
        this.worker.postMessage({"interval" : lookaheadTime});
    };

    return new SequencerWorker();
}])
.controller('schedulerController',['sequencerService','$scope',function(sequencer, $scope){
    var self = $scope;
    self.sequencer = sequencer.getScheduler();
    console.log(self.sequencer);
    self.play = function () {
        self.sequencer.play();
    };
    self.shit = function (){
        self.currentTime = self.sequencer.getCurrentTime();
    };
    self.currentTime;
    self.$watch('sequencer.currentTime', function (n, o){
        //console.log(n,o);
        //self.currentTime = n;
    });
}])
.service('notesFactory', [function() {
    return {

    }
}]);