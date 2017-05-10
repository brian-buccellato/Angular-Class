var app = angular.module('codecraft', [
	'ngResource',
	'infinite-scroll',
	'angularSpinner',
	'jcs-autoValidate',
	'angular-ladda',
	'mgcrea.ngStrap',
	'toaster',
	'ngAnimate',
	'ui.router',
]);

/*
 * called before controller and services are created
 * this code is basically saying when we create the http 
 * service, the authorization field of the request header
 * should be set to this token. 
 */
 
 app.config(function($stateProvider, $urlRouterProvider){
	 $stateProvider
		.state('list', {
			views: {
				'main': {
					templateUrl: 'templates/list.html',
					controller: 'PersonListController'
				},
				'search': {
					templateUrl: 'templates/searchform.html',
					controller: 'PersonListController'
				}
			},
			url: "/",
		})
		.state('edit', {
			views: {
				'main': {
					templateUrl: 'templates/details.html',
					controller: 'PersonDetailController'
				}
			},
			url: "/edit/:email",
		})
		.state('create', {
			views: {
				'main': {
					templateUrl: 'templates/details.html',
					controller: 'PersonCreateController'
				}
			},
			url: "/create",
		});
	
	$urlRouterProvider.otherwise("/");
 });
 
app.config(function($httpProvider, $resourceProvider, laddaProvider, $datepickerProvider){
	$httpProvider.defaults.headers.common['Authorization'] =
		'Token 656236dcd0448d470e646d856f4a2182fd2dbbb6';
	$resourceProvider.defaults.stripTrailingSlashes = false;
	laddaProvider.setOption({
		style: 'expand-right'
	});
	angular.extend($datepickerProvider.defaults, {
		//autoClose: true,
		autoclose: true
	});
});

app.factory("Contact", function($resource){
	return $resource("https://api.codecraft.tv/samples/v1/contact/:id/", {id:'@id'},{		
		update: {
			method: 'PUT'
		}			
	});
});

app.directive('ccSpinner', function(){
	return {
		//'transclude': true,
		'restrict': 'E',
		'templateUrl': 'templates/spinner.html',
		'scope': {
			'isLoading': '=', // "i want this local scope variable to linked to something from the outter scope"
			'message': '@' // "just return the value of what is passed"
		}
	}
});

app.directive('ccCard', function(){
	return {
		'restrict': 'AE',
		'templateUrl': 'templates/cards.html',
		'scope': {
			'user': '=',
			'deleteUser': '&'
		},
		'controller': function($scope, ContactService){
			$scope.isDeleting = false;
			$scope.contacts = ContactService;
			$scope.deleteUserController = function(){
				console.log('deleteme');
				$scope.isDeleting = true;
				$scope.contacts.removeContact($scope.user)	
					.then(function(){
						$scope.isDeleting = false;
					});
			}
		}
	}
});

/* 
 * 
 * API token for codecraft
 * 656236dcd0448d470e646d856f4a2182fd2dbbb6
 * 
 * */
 
 app.filter('defaultImage', function(){
	 return function(input, param){
		 if(!input){
			 return param;
		 }
		 return input;
	 }
 });

 app.controller('PersonCreateController', function($scope, $state, ContactService){
		$scope.contacts = ContactService;
		$scope.contacts.selectedPerson = {};
		$scope.mode = "Create";
		$scope.save = function(){
			$scope.contacts.createContact($scope.contacts.selectedPerson)
				.then(function(){
					$state.go('list');
			});
	}
 });
 
app.controller('PersonDetailController', function ($scope, ContactService, 
															$stateParams, $state) {

	$scope.contacts = ContactService;
	$scope.mode = "Edit";
	$scope.contacts.selectedPerson = $scope.contacts.getPerson($stateParams.email);
	console.log($scope.contacts.selectedPerson );
	$scope.save = function(){
		$scope.contacts.updateContact($scope.contacts.selectedPerson).then(function(){
			$state.go('list');
		});
		
	};
	$scope.remove = function(){
		$scope.contacts.removeContact($scope.contacts.selectedPerson).then(function(){
			$state.go('list');
		});
	};
});

app.controller('PersonListController', function ($scope, ContactService, $modal, $state) {
	
	$scope.search = "";
	$scope.order = "email";
	$scope.contacts = ContactService;
	$scope.parentDeleteUser = function(user){
		
		$scope.contacts.removeContact(user).then(function(){
			$state.go('list');
		});
	};
	/* $scope.showCreateModal = function(){
		$scope.contacts.selectedPerson = {};
		$scope.createModal = $modal({
			scope: $scope,
			template: 'templates/modal.create.tpl.html',
			show: true
		});
	} */
	
	$scope.loadMore = function(){
		$scope.contacts.loadMore();
	};
	
});

app.service('ContactService', function (Contact, $rootScope, $q, toaster) {
	console.log(toaster);
	var self = {
			'getPerson': function(email){
				for(var i = 0; i < self.persons.length; i++){
					if(self.persons[i].email == email){
						return self.persons[i];
					}
				}
			},
			'page': 1,
			'hasMore': true,
			'isLoading': false,
			'isSaving': false,
			'isDeleting': false,
			'selectedPerson': null,
			'persons': [],
			'search': null,
			'ordering': 'name', 
			'doSearch': function(){
				self.hasMore = true;
				self.page = 1;
				self.persons = [];
				self.loadContacts();
			},
			'doOrder': function(){
				self.hasMore = true;
				self.page = 1;
				self.persons = [];
				self.loadContacts();
			},
			'loadContacts': function(){
				if(self.hasMore && !self.isLoading){
					self.isLoading = true;
					var params = {
						'page': self.page,
						'search': self.search,
						'ordering': self.ordering
					};
					Contact.get(params, function(data){
						console.log(data);
						angular.forEach(data.results, function(person){
							self.persons.push(new Contact(person));
						});
						if(!data.next){
							self.hasMore = false;
						}
						self.isLoading = false;
					});
				}
			},
			'loadMore': function(){
				if(self.hasMore && !self.isLoading){
					self.page += 1;
					self.loadContacts();
				}
			},
			'updateContact': function(person){
				self.isSaving = true;
				var d = $q.defer();
				person.$update().then(function(){
					self.isSaving = false;
					toaster.pop('success', 'Successfully Updated Contact ' + person.name);
					d.resolve();
				});
				return d.promise;
			},
			'removeContact': function(person){
				var d = $q.defer();
				self.isDeleting = true;
				person.$remove().then(function(){
					self.isDeleting = false;
					var index = self.persons.indexOf(person);
					self.persons.splice(index, 1);
					self.selectedPerson = null;
					toaster.pop('success', 'Successfully Removed Contact ' + person.name);
					d.resolve();
				});
				return d.promise;
			},
			'createContact': function(person){
				var d = $q.defer();
				self.isSaving = true;
				Contact.save(person).$promise.then(function(){
					self.isSaving = false;
					self.selectedPerson = null;
					self.hasMore = true;
					self,page = 1;
					self.persons = [];
					self.loadContacts();
					toaster.pop('success', 'Successfully Created Contact ' + person.name);
					//no access to modal here!
					d.resolve();
				});
				return d.promise;
			},
			'watchFilters': function(){
				$rootScope.$watch(function(){
					return self.search;
				}, function(nu){
					if(angular.isDefined(nu)){
						self.doSearch();
					}
				});
				$rootScope.$watch(function(){
					return self.ordering;
				}, function(nu){
					if(angular.isDefined(nu)){
						self.doOrder();
					}
				});
			}
	};
	self.loadContacts();
	self.watchFilters();
	return self;
});