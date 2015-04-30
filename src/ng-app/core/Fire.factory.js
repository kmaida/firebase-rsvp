(function() {
	'use strict';

	angular
		.module('myApp')
		.factory('Fire', Fire);

	Fire.$inject = ['$firebaseAuth'];

	function Fire($firebaseAuth) {

		var ref = new Firebase('https://intense-heat-5822.firebaseio.com/');

		function auth() {
			return $firebaseAuth(ref);
		}

		return {
			ref: ref,
			auth: auth
		}
	}
})();