angular.module('Instruments',['simpleSynth', 'anotherSynth'])
.directive('instrumentControl', [function(){
    return {
        restrict : "A",
        scope : true,
        link : function ($scope, $el, $attr) {
            $scope.getTemplate = function () {
                return 'app/components/instruments/' + $scope.device.instrument_instance.id + '/view.html'
            }
            $scope
        },
        controller : function ($scope) {
            $scope.instrument = $scope.device.instrument_instance;
        },
        template : '<div class="instrument-control-outer-wrapper" ng-include="getTemplate()"></div>'
    };
}])
.directive('addEffect', [function(){
    return {
        restrict : "A",
        scope : true,
        transclude : true,
        link : function ($scope, $el, $attr) {

        },
        controller : function ($scope) {
            $scope.instrument = $scope.device.instrument_instance;
        },
        templateUrl : 'app/components/instruments/addEffectsDirective.html'
    };
}])
.controller('InstrumentsController', ['InstrumentsService', 'utilitiesService', function (InstrumentsService, utilitiesService) {
    var vm = this;
    vm.instruments = InstrumentsService;
    //console.log(vm.instruments);
    vm.crack = 1;
}]).
service('InstrumentsService',['simpleSynth', 'anotherSynth','utilitiesService', function(simpleSynth, anotherSynth, utilitiesService){
    this.availableInstruments = {
        "simple_synth" : simpleSynth,
        "another_synth" : anotherSynth
    };
    this.getInstrument = function ( name, device ) {
        var id = utilitiesService.uniqueId();
        return this.availableInstruments[name].getInstance( id, device );
    };
}]);