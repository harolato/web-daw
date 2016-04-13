/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
angular.module('Instruments',[ 'simpleSynth', 'Effects'])
    /*
    directive   : instrumentControl
    desc        : Displays partial-view for particular instrument settings user interface
     */
.directive('instrumentControl', ['$compile','$timeout', function($compile, $timeout){
    return {
        restrict : "A",
        scope : true,
        link : function ($scope, $element) {
            // Get template depending on instrument
            $scope.getTemplate = function () {
                return 'app/components/instruments/' + $scope.device.instrument_instance.id + '/view.html'
            };
            // Look up if device contains any sound effects
            if ( $scope.device.effects_chain.length > 0 ) {
                // Wait until DOM is ready
                $timeout(function(){
                    var childScope;
                    // Flip array of effects
                    $scope.device.effects_chain.reverse();
                    // Scan through list of effects
                    $scope.device.effects_chain.forEach(function( e, i ){
                        childScope = $scope.$new();
                        //$el[0].querySelector('.effect-list ul li[data-id=' + e.id + ']').remove();
                        // For each effect create control user interface
                        var es = document.querySelector('.instrument-control-wrapper .instrument-control-outer-wrapper .stack-horizontally:nth-last-child(2)');
                        var block = $compile('<div class="stack-horizontally effect" effect-control="' + e.id + '" reinitialize="true" sequence-number="' + i + '"></div>')(childScope);
                        angular.element(es).after(block);
                    });
                },500);
            }

        },
        controller : function ($scope) {
            // Send current instruments logic to view
            $scope.instrument = $scope.device.instrument_instance;
        },
        template : '<div class="instrument-control-outer-wrapper" ng-include="getTemplate()"></div>'
    };
}])
.controller('InstrumentsController', ['InstrumentsService', function (InstrumentsService) {
    var vm = this;
    vm.instruments = InstrumentsService;
}]).
    /*
    service :InstrumentsService
    desc    : Service holds a list of available instruments and function to get a new instance of an instrument
     */
service('InstrumentsService', [ 'simpleSynth', function( simpleSynth){

    this.availableInstruments = [
        {
            id : "simple_synth",
            name : "Simple Synthesizer",
            instrument : simpleSynth
        }
    ];
    /*
        desc    : creates new instance of an instrument class
        arg     : id - String representing id of an instrument
        return  : Intrument Object

     */
    this.getInstrument = function ( id ) {
        for ( var i = 0 ; i < this.availableInstruments.length ; i++ ) {
            if ( this.availableInstruments[i].id == id ) {
                var instr = this.availableInstruments[i].instrument;
                var inst = new instr();
                return inst;
            }
        }
    };
}]);