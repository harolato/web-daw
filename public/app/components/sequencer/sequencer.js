/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
angular.module('Sequencer',['Devices', 'keyboard']).
controller('sequencerController', [function(){
    //var vm = $scope;
}])
.directive("schedulerControls", ["schedulerService","$timeout", "$window", "$rootScope",function(schedulerService, $timeout, $window, $rootScope){
    return {
        restrict: "A",
        scope: true,
        link: function ( $scope ) {
            $scope.hasFinished = false;
            $rootScope.$on("finishedTrack", function(){
                $scope.hasFinished = true;
            });
            $scope.play = function (){
                schedulerService.play();
                var seeker = document.querySelectorAll(".seeker");
                if ( $scope.params.isPlaying ) {
                    if ( $scope.hasFinished ) {
                        angular.forEach(seeker, function (e) {

                            e.style.WebkitTransition = "";
                            e.style.MozTransition = "";
                            e.style.left = "" + 0 + "px";
                        });
                        $scope.hasFinished = false;
                    }
                    $timeout(function(){
                        angular.forEach(seeker, function(e){
                            if ( $scope.hasFinished ) {
                                e.style.WebkitTransition = "";
                                e.style.MozTransition = "";
                                e.style.left = "" + 0 + "px";
                            }
                            e.style.WebkitTransition = "all " + ($scope.params.trackLength - $scope.params.currentTime) + "s linear";
                            e.style.MozTransition = "all " + ($scope.params.trackLength - $scope.params.currentTime) + "s linear";
                            e.style.left = "" + $scope.params.trackLength*80 + "px";
                        })
                    },0);

                } else {
                    angular.forEach(seeker, function(e){
                        e.style.left = $scope.params.currentTime*80 + "px";
                        e.style.WebkitTransition = "";
                        e.style.MozTransition = "";
                    })
                }
            };
        },
        controller: function ( $scope ) {
            //console.log(schedulerService);
            $rootScope.$on("BPMChanged", function (){
                //console.log("FIRE");
            });
            $scope.params = schedulerService.params;
            $scope.$watch('params.BPM', function (n){
                schedulerService.changeBPM(n);
            });
            $scope.togglePlayButton = function () {
                return {
                    'fa-play' : !$scope.params.isPlaying,
                    'fa-pause' : $scope.params.isPlaying
                }
            };

        },
        templateUrl : "app/components/sequencer/view.html"
    }
}])
.service("schedulerService", ['devicesService', 'keyboardHelperService','$timeout','$interval', 'sequencerWorkerService','audioCtx','$q','$rootScope', function(devices, keyboard, $timeout, $interval, worker, ctx, $q, $rootScope){
    var params = {
        BPM         : 120,
        lookahead   : 0.01, // seconds50
        isPlaying   : false,
        currentTime : 0,
        trackLength : 0,
        gap         : 0
    };

    var interval = 10/params.BPM*1000; // 30 - eighth, 15 - sixteenth, 60 - quarter
    var beatLen = 60/params.BPM; // 60 seconds multiplied by BPM. one quarter note duration. seconds
    var tracks = null;
    var nextNoteIndex = 0;
    var allTracks = [];
    var nextNoteTime;
    var startTime = null;
    var scheduled = true;
    var pauseTime = 0;

    var changeBPM = function (BPM) {
        params.BPM = BPM;
        interval = 10/params.BPM*1000; // 30 - eighth, 15 - sixteenth, 60 - quarter
        beatLen = 60/params.BPM; // 60 seconds multiplied by BPM. one quarter note duration. seconds
        worker.interval = interval;
    };

    var getTracks = function () {
        var defered = $q.defer();
        var tmp = [];
        // Fetch all tracks
        defered.notify("about to update tracks");
        tracks = devices.getAll();
        tracks.forEach(function(device) {
            // Save to temporary array for comparison
            if ( device.notes )
            tmp = tmp.concat(device.notes);
        });
        // compare new track to current one
        var unique = tmp.concat(allTracks).filter(function() {
            var seen = {};
            return function( element ) {
                return !( element.start+element.end+element.note in seen) && (seen[element.start+element.end+element.note] = 1);
            };
        }());
        // If no changes found terminate function
        //console.log([unique.length, allTracks.length, tmp]);

        if ( unique.length == allTracks.length ) {
            defered.resolve({message : "no changes found"});
        } else {
            // otherwise update track list
            //console.log("please wait...");
            allTracks = angular.copy(tmp);

            allTracks.sort(sortNotes);
            defered.resolve({message : "Sort complete"});
        }
        return defered.promise;
    };

    var play = function (stop) {

        if ( stop ) {
            worker.stop();
            params.isPlaying = false;
            nextNoteIndex = 0;
            nextNoteTime = 0;
            params.currentTime = 0;
            params.trackLength = 0;
            startTime = 0;
            pauseTime = 0;
            $rootScope.$emit("finishedTrack");
            return;
        }

        params.isPlaying = !params.isPlaying;
        if ( params.isPlaying ) {
            var updateTracks = getTracks();
            updateTracks.then(function(res){
                //allTracks.forEach(function(note){
                //    console.log(calculateNoteTiming(note).time);
                //});
                params.trackLength = calculateNoteTiming(allTracks[allTracks.length-1]).time.end;
                worker.start();
                startTime = ctx.currentTime;
                if ( pauseTime > 0 ) {
                    startTime -= pauseTime;
                    console.log("Pause time: ", pauseTime, startTime);
                }

                nextNoteTime = calculateNoteTiming(allTracks[nextNoteIndex]).time.start;
            });
        } else {
            worker.stop();
            tracks.forEach(function (track){
                track.instrument_instance.stop(0, true);
            });

            pauseTime = ctx.currentTime - startTime;
            //console.log("Pause time: ", pauseTime, startTime);
        }
    };


    var initialize = function () {
        //console.log("inited");
        //console.log(worker);
        worker.WebWorker.onmessage = function (e) {
            if ( e.data == "tick" ) {
                schedule();
            } else {
                //console.log({"message" : e.data});
            }
        };
        worker.interval = interval;
    };

    var scheduleNote = function () {
        //var device = devices.get(note.target);
        //console.log(device);
        scheduled = false;
        var note = allTracks[nextNoteIndex];
        var schedule = {
            start : ctx.currentTime + params.gap,
            stop  : ctx.currentTime + note.time.end - note.time.start
        };
        console.log("Schedule: ", schedule);
        //console.log("Note object: " , note);
        note.target.instrument_instance.play( keyboard.getFrequencyOfNote(note.note), schedule,note.velocity);
        nextNote();
        scheduled = true;
        //console.log("scheduleNote()",nextNoteTime);

        //nextNoteIndex++;
    };

    var nextNote = function(returnNote){
        //var ct = ctx.currentTime;
        //if ( nextNoteIndex >= allTracks.length ) return false;
        //var next = calculateNoteTiming(allTracks[nextNoteIndex]);
        //if ( returnNote ){
        //    next.time.end += ct;
        //    next.time.start += ct
        //    return next;
        //}
        //
        //var lookahead = ct + lookahead;
        //if ( ( next.time.start  < lookahead) && nextNoteIndex < allTracks.length ) {
        //    console.log(true,(next.time.start+ct), lookahead, startTime);
        //    return true;
        //} else {
        //    console.log(false,(next.time.start+ct), lookahead);
        //    return false;
        //
        //}
        nextNoteIndex++;
        if ( !allTracks[nextNoteIndex] ) return;
        var nn = calculateNoteTiming(allTracks[nextNoteIndex]);
        //var pn = calculateNoteTiming(allTracks[nextNoteIndex-1]);
        nextNoteTime = nn.time.start;
        //console.log('nextNote()',nextNoteTime, nextNoteIndex, nn,pn);
    };

    var increaseTimer = function(){
        $timeout(function(){
            params.currentTime = ctx.currentTime - startTime;
        },0);
    };

    var schedule = function () {
        console.log("schedulin***************************************************");

        //var updateTracks = getTracks();
        //updateTracks.then(function (r){
        console.log(params.trackLength, params.currentTime);
        if ( params.trackLength <= params.currentTime ) {
            play(true);
            return;
        };
        increaseTimer();
        console.log("Timings: ",nextNoteTime, (params.currentTime + params.lookahead));
        while ( parseFloat(nextNoteTime) < parseFloat(params.currentTime + params.lookahead) && nextNoteIndex < allTracks.length && params.isPlaying ) {
            console.log("loopin");
            //console.log(ctx.currentTime);
            if ( scheduled ) {
                scheduleNote();
            }
            //if ( nextNoteIndex >= allTracks.length ) play(true);
        }
        //});
    };
    var sortNotes = function (a, b) {

        //var astart  = breakNoteCoordinates(a.start);
        //var bstart  = breakNoteCoordinates(b.start);
        //
        //if ( astart['bar'] > bstart['bar'] ) {
        //    return 1;
        //} else if ( astart['bar'] == bstart['bar'] ) {
        //    if ( astart['beat'] == bstart['beat'] ) {
        //        if ( astart['eighth'] == bstart['eighth'] ) {
        //            return 0;
        //        } else if ( astart['eighth'] > bstart['eighth'] ) {
        //            return 1;
        //        } else {
        //            return -1;
        //        }
        //    } else if ( astart['quarter'] > bstart['quarter'] ) {
        //        return 1;
        //    } else {
        //        return -1;
        //    }
        //} else {
        //    return -1;
        //}
        a = calculateNoteTiming(a);
        b = calculateNoteTiming(b);
        if ( a.time.start > b.time.start ) {
            return 1;
        } else if (a.time.start == b.time.start ) {
            return 0;
        } else {
            return -1;
        }
    };

    var breakNoteCoordinates = function (coords) {
        var brake = coords.split(".");
        //console.log(brake);
        return {
            bar    : parseInt(brake[0]),
            beat    : parseInt(brake[1]),
            eighth  : parseInt(brake[2])
        };
    };

    var noteLength = function ( type ) {
        //console.log(beatLen);
        switch ( type ) {
            case "bar"      : return beatLen*4; // Length of a bar (4 quarter notes)
            case "beat"  : return beatLen; // Length of a beat  (1 quarter note)
            case "eighth"   : return (beatLen/2); // Length of a eighth note ( 1/8  note)
            default: return false;
        }
    };

    var calculateNoteTiming = function (note) {
        var start = breakNoteCoordinates(note.start);
        var end = breakNoteCoordinates(note.end);
        //console.log(start,end);
        var noteStartTime =
            ( start.bar * noteLength("bar")) +
            ( start.beat * noteLength("beat") ) +
            ( start.eighth * noteLength("eighth") );
        var noteEndTime =
            ( end.bar * noteLength("bar")) +
            ( end.beat * noteLength("beat") ) +
            ( end.eighth * noteLength("eighth") );
        note.time = {
            start  : noteStartTime,
            end    : noteEndTime
        };
        return note;
    };



    initialize();

    this.play = play;
    this.calculateNoteTiming = calculateNoteTiming;
    this.changeBPM = changeBPM;
    this.params = params;
}])
.factory('sequencerService', ['devicesService', 'keyboardHelperService','$timeout','$interval', 'sequencerWorkerService','audioCtx','$q','$rootScope', function(devices, keyboard, $timeout, $interval, worker, ctx, $q, $rootScope){
    var Scheduler = function () {
        var params = {
            BPM         : 50,
            lookahead   : 0.01, // seconds50
            interval    : 10/120*1000, // 30 - eighth, 15 - sixteenth, 60 - quarter
            isPlaying   : false,
            currentTime : 0,
            trackLength : 0,
            gap         : 0
        };


        var beatLen = 60/params.BPM; // 60 seconds multiplied by BPM. one quarter note duration. seconds
        var tracks = null;
        var nextNoteIndex = 0;
        var allTracks = [];
        var nextNoteTime;
        var startTime = null;
        var scheduled = true;
        var pauseTime = 0;

        var getTracks = function () {
                var defered = $q.defer();
                var tmp = [];
                // Fetch all tracks
                defered.notify("about to update tracks");
                tracks = devices.getAll();
                tracks.forEach(function(device) {
                    if (device.enabled){
                    // Save to temporary array for comparison
                        tmp = tmp.concat(device.notes);
                    }
                });
                // compare new track to current one
                var unique = tmp.concat(allTracks).filter(function() {
                    var seen = {};
                    return function( element ) {
                        return !( element.start+element.end+element.note in seen) && (seen[element.start+element.end+element.note] = 1);
                    };
                }());
                // If no changes found terminate function
                //console.log([unique.length, allTracks.length, tmp]);
    
                if ( unique.length == allTracks.length ) {
                    defered.resolve({message : "no changes found"});
                } else {
                    // otherwise update track list
                    console.log("please wait...");
                    allTracks = angular.copy(tmp);

                    allTracks.sort(sortNotes);
                    defered.resolve({message : "Sort complete"});
                }
            return defered.promise;
        };
    
        var play = function (stop) {
    
            if ( stop ) {
                worker.stop();
                params.isPlaying = false;
                nextNoteIndex = 0;
                nextNoteTime = 0;
                params.currentTime = 0;
                params.trackLength = 0;
                startTime = 0;
                pauseTime = 0;
                $rootScope.$emit("finishedTrack");
                return;
            }

            params.isPlaying = !params.isPlaying;
            if ( params.isPlaying ) {
                var updateTracks = getTracks();
                updateTracks.then(function(res){
                    //allTracks.forEach(function(note){
                    //    console.log(calculateNoteTiming(note).time);
                    //});
                    params.trackLength = calculateNoteTiming(allTracks[allTracks.length-1]).time.end;
                    worker.start();
                    startTime = ctx.currentTime;
                    if ( pauseTime > 0 ) {
                        startTime -= pauseTime;
                        //console.log("Pause time: ", pauseTime, startTime);
                    }

                    nextNoteTime = calculateNoteTiming(allTracks[nextNoteIndex]).time.start;
                });
            } else {
                worker.stop();
                tracks.forEach(function (track){
                    track.instrument_instance.stop(0, true);
                });

                pauseTime = ctx.currentTime - startTime;
                //console.log("Pause time: ", pauseTime, startTime);
            }
        };

    
        var initialize = function () {
            //console.log("inited");
            //console.log(worker);
            worker.WebWorker.onmessage = function (e) {
                if ( e.data == "tick" ) {
                    schedule();
                } else {
                    //console.log({"message" : e.data});
                }
            };
            worker.interval = params.interval;
        };
    
        var scheduleNote = function () {
            //var device = devices.get(note.target);
            //console.log(device);
            scheduled = false;
            var note = allTracks[nextNoteIndex];
            var schedule = {
                start : ctx.currentTime + params.gap,
                stop  : ctx.currentTime + note.time.end - note.time.start
            };
            console.log("Schedule: ", schedule);
            //console.log("Note object: " , note);
            note.target.instrument_instance.play( keyboard.getFrequencyOfNote(note.note), schedule,note.velocity);
            nextNote();
            scheduled = true;
            //console.log("scheduleNote()",nextNoteTime);
    
            //nextNoteIndex++;
        };
    
        var nextNote = function(returnNote){
            //var ct = ctx.currentTime;
            //if ( nextNoteIndex >= allTracks.length ) return false;
            //var next = calculateNoteTiming(allTracks[nextNoteIndex]);
            //if ( returnNote ){
            //    next.time.end += ct;
            //    next.time.start += ct
            //    return next;
            //}
            //
            //var lookahead = ct + lookahead;
            //if ( ( next.time.start  < lookahead) && nextNoteIndex < allTracks.length ) {
            //    console.log(true,(next.time.start+ct), lookahead, startTime);
            //    return true;
            //} else {
            //    console.log(false,(next.time.start+ct), lookahead);
            //    return false;
            //
            //}
            nextNoteIndex++;
            if ( !allTracks[nextNoteIndex] ) return;
            var nn = calculateNoteTiming(allTracks[nextNoteIndex]);
            //var pn = calculateNoteTiming(allTracks[nextNoteIndex-1]);
            nextNoteTime = nn.time.start;
            //console.log('nextNote()',nextNoteTime, nextNoteIndex, nn,pn);
        };
    
        var increaseTimer = function(){
            $timeout(function(){
                params.currentTime = ctx.currentTime - startTime;
            },0);
        };
    
        var schedule = function () {
            //console.log("schedulin***************************************************");
    
            //var updateTracks = getTracks();
            //updateTracks.then(function (r){
            //console.log(params.trackLength, params.currentTime);
            if ( params.trackLength <= params.currentTime ) {
                play(true);
                return;
            };
            increaseTimer();
            //console.log("Timings: ",nextNoteTime, (params.currentTime + params.lookahead));
            while ( parseFloat(nextNoteTime) < parseFloat(params.currentTime + params.lookahead) && nextNoteIndex < allTracks.length && params.isPlaying ) {
                //console.log("loopin");
                //console.log(ctx.currentTime);
                if ( scheduled ) {
                    scheduleNote();
                }
                //if ( nextNoteIndex >= allTracks.length ) play(true);
            }
            //console.log("end schedule");
            //});
        };
        var sortNotes = function (a, b) {

            //var astart  = breakNoteCoordinates(a.start);
            //var bstart  = breakNoteCoordinates(b.start);
            //
            //if ( astart['bar'] > bstart['bar'] ) {
            //    return 1;
            //} else if ( astart['bar'] == bstart['bar'] ) {
            //    if ( astart['beat'] == bstart['beat'] ) {
            //        if ( astart['eighth'] == bstart['eighth'] ) {
            //            return 0;
            //        } else if ( astart['eighth'] > bstart['eighth'] ) {
            //            return 1;
            //        } else {
            //            return -1;
            //        }
            //    } else if ( astart['quarter'] > bstart['quarter'] ) {
            //        return 1;
            //    } else {
            //        return -1;
            //    }
            //} else {
            //    return -1;
            //}
            a = calculateNoteTiming(a);
            b = calculateNoteTiming(b);
            if ( a.time.start > b.time.start ) {
                return 1;
            } else if (a.time.start == b.time.start ) {
                return 0;
            } else {
                return -1;
            }
        };

        var breakNoteCoordinates = function (coords) {
            var brake = coords.split(".");
            //console.log(brake);
            return {
                bar    : parseInt(brake[0]),
                beat    : parseInt(brake[1]),
                eighth  : parseInt(brake[2])
            };
        };

        var noteLength = function ( type ) {
            switch ( type ) {
                case "bar"      : return beatLen*4; // Length of a bar (4 quarter notes)
                case "beat"  : return beatLen; // Length of a beat  (1 quarter note)
                case "eighth"   : return (beatLen/2); // Length of a eighth note ( 1/8  note)
                default: return false;
            }
        };

        var calculateNoteTiming = function (note) {
            var start = breakNoteCoordinates(note.start);
            var end = breakNoteCoordinates(note.end);
        //console.log(start,end);
            var noteStartTime =
                ( start.bar * noteLength("bar")) +
                ( start.beat * noteLength("beat") ) +
                ( start.eighth * noteLength("eighth") );
            var noteEndTime =
                ( end.bar * noteLength("bar")) +
                ( end.beat * noteLength("beat") ) +
                ( end.eighth * noteLength("eighth") );
            note.time = {
                start  : noteStartTime,
                end    : noteEndTime
            };
            return note;
        };

        initialize();

        return {
            get params() {
                return params;
            },
            get interval(){
              return params.interval;
            },
            get BPM () {
              return params.BPM;
            },
            set BPM ( a ) {
                params.BPM = a;
            },
            play : function(){
                $timeout(function(){
                    play();
                },0);
            }
        };
    };
    return new Scheduler();
    //var play = function () {
    //
    //    devices.forEach(function(device){
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
    //stop = function (){
    //    var ap = AudioParam.cancelScheduledValues(ctx.currentTime);
    //}

}])
.service('sequencerWorkerService', [function () {
    function SequencerWorker () {
        var WebWorker = new Worker('app/components/sequencer/sequencerWorker.js');
        var stop = function () {
            WebWorker.postMessage("stop");
        }
        var start = function () {
            WebWorker.postMessage("start");
        }
        var changeInterval = function ( lookaheadTime ) {
            WebWorker.postMessage({"interval" : lookaheadTime});
        }
        return {
            get WebWorker () {
                return WebWorker;
            },
            set interval (a) {
                changeInterval(a);
            },
            start : start,
            stop  : stop
        }
    }
    return new SequencerWorker();
}])
.controller('schedulerController',['sequencerService','$scope',function(sequencer, $scope){
    var self = $scope;
    self.sequencer = sequencer.getScheduler();
    //console.log(self.sequencer);
    self.play = function () {
        self.sequencer.play();
    };
    self.debug = function (){
        self.currentTime = self.sequencer.getCurrentTime();
    };
    self.currentTime;
    self.$watch('sequencer.currentTime', function (n, o){
        //console.log(n,o);
        //self.currentTime = n;
    });
}])
.directive("scrollBar", [function(){
    return {
        restrict    : "A",
        scope : true,
        transclude: true,
        link : function ($scope, $el) {
            var scrollHandler = function (e){
                var notePreviews = document.querySelectorAll(".note-preview, .timescale-wrapper-outter");
                var self = angular.element(this)[0];
                angular.forEach(angular.element(notePreviews), function(e) {
                    e.scrollLeft = self.scrollLeft;
                });
            };
            angular.element($el).bind('scroll',scrollHandler);
        },
        template : '<div class="scroll-bar-wrapper">&nbsp;</div>'
    }
}])
.service('notesFactory', [function() {
    return {

    }
}]);