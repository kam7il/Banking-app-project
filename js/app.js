//https://medium.com/@kj_schmidt/making-an-animated-donut-chart-with-d3-js-17751fde4679
var app = angular.module("app", [
    "ngSanitize",
    "ngRoute",
    "ngAnimate",
    "ngWebSocket",
    "ui.bootstrap",
    "nvd3"
]);

// zmienne globalne
app.value("globals", {
    email: "",
    isAdmin: false
});

// nowe podstrony i ich kontrolery
app.constant("routes", [
    {
        route: "/",
        templateUrl: "/html/home.html",
        controller: "Home",
        controllerAs: "ctrl",
        menu: '<i class="fa fa-lg fa-home"></i>',
        guest: true
    },
    {
        route: "/transfer",
        templateUrl: "/html/transfer.html",
        controller: "Transfer",
        controllerAs: "ctrl",
        menu: "Przelew"
    },
    {
        route: "/history",
        templateUrl: "/html/history.html",
        controller: "History",
        controllerAs: "ctrl",
        menu: "Historia"
    },
    {
        route: "/trend",
        templateUrl: "/html/trend.html",
        controller: "Trend",
        controllerAs: "ctrl",
        menu: "Trend"
    },
    //MOJE
    {
        route: "/adminPanel",
        templateUrl: "/html/adminPanel.html",
        controller: "AdminPanel",
        controllerAs: "ctrl",
        menu: "Admin Panel",
        onlyAdmin: true
    }
    //
]);

app.config([
    "$routeProvider",
    "$locationProvider",
    "routes",
    function($routeProvider, $locationProvider, routes) {
        $locationProvider.hashPrefix("");
        for (var i in routes) {
            $routeProvider.when(routes[i].route, routes[i]);
        }
        $routeProvider.otherwise({ redirectTo: "/" });
    }
]);

app.controller("loginDialog", [
    "$http",
    "$uibModalInstance",
    function($http, $uibModalInstance) {
        var ctrl = this;
        // devel: dla szybszego logowania
        ctrl.creds = { email: "jim@beam.com", password: "admin1" };
        ctrl.loginError = false;
        ctrl.errorMessage = "";

        ctrl.tryLogin = function() {
            $http.post("/login", ctrl.creds).then(
                function(rep) {
                    //$uibModalInstance.close(rep.data.email);
                    $uibModalInstance.close(rep.data);
                },
                function(err) {
                    //console.log(err);
                    ctrl.errorMessage = err.data.error;
                    ctrl.loginError = true;
                }
            );
        };

        ctrl.cancel = function() {
            $uibModalInstance.dismiss("cancel");
        };
    }
]);

//MOJE
app.controller("registerDialog", [
    "$http",
    "$uibModalInstance",
    "common",
    function($http, $uibModalInstance, common) {
        var ctrl = this;
        // devel: dla szybszego logowania
        ctrl.creds = { email: "", password: "", passwordRepeat: "" };
        ctrl.registerError = false;
        ctrl.errorMessage = "";

        ctrl.register = function() {
            $http.post("/register", ctrl.creds).then(
                function(rep) {
                    $uibModalInstance.close(rep.data.email);
                    common.showMessage(rep.data);
                },
                function(err) {
                    ctrl.errorMessage = err.data.error;
                    ctrl.registerError = true;
                }
            );
        };

        ctrl.cancel = function() {
            $uibModalInstance.dismiss("cancel");
        };
    }
]);

app.controller("Menu", [
    "$http",
    "$rootScope",
    "$scope",
    "$location",
    "$uibModal",
    "$websocket",
    "routes",
    "globals",
    "common",
    function(
        $http,
        $rootScope,
        $scope,
        $location,
        $uibModal,
        $websocket,
        routes,
        globals,
        common
    ) {
        var ctrl = this;

        ctrl.alert = common.alert;
        ctrl.menu = [];
        ctrl.loggedOut = true;

        var refreshMenu = function() {
            ctrl.menu = [];
            for (var i in routes) {
                if ( (routes[i].guest || globals.email) && routes[i].onlyAdmin !== true) {
                    ctrl.menu.push({
                        route: routes[i].route,
                        title: routes[i].menu
                    });
                } else if (routes[i].onlyAdmin && globals.isAdmin === true) {
                    ctrl.menu.push({
                        route: routes[i].route,
                        title: routes[i].menu
                    });
                }
            }
        };

        $http.get("/login").then(
            function(rep) {
                globals.email = rep.data.email;
                globals.isAdmin = rep.data.isAdmin;
                refreshMenu();

                try {
                    var dataStream = $websocket("ws://" + window.location.host);
                    dataStream.onMessage(function(rep) {
                        try {
                            var message = JSON.parse(rep.data);
                            for (var topic in message) {
                                $rootScope.$broadcast(topic, message[topic]);
                            }
                        } catch (ex) {
                            console.error(
                                "Data from websocket cannot be parsed: " +
                                    rep.data
                            );
                        }
                    });
                    dataStream.send(
                        JSON.stringify({
                            action: "init",
                            session: rep.data.session
                        })
                    );
                } catch (ex) {
                    console.error(
                        "Initialization of websocket communication failed"
                    );
                }
            },
            function(err) {
                globals.email = null;
                globals.isAdmin = false;
            }
        );

        ctrl.isCollapsed = true;

        $scope.$on("$routeChangeSuccess", function() {
            ctrl.isCollapsed = true;
        });

        ctrl.navClass = function(page) {
            return page === $location.path() ? "active" : "";
        };

        ctrl.loginIcon = function() {
            return globals.email
                ? globals.email +
                      '&nbsp;<span class="fa fa-lg fa-sign-out"></span>'
                : '<span class="fa fa-lg fa-sign-in"></span>';
        };

        ctrl.login = function() {
            if (globals.email) {
                common.confirm(
                    {
                        title: "Koniec pracy?",
                        body: "Chcesz wylogować " + globals.email + "?"
                    },
                    function(answer) {
                        if (answer) {
                            $http.delete("/login").then(
                                function(rep) {
                                    ctrl.loggedOut = true;
                                    globals.email = null;
                                    globals.isAdmin = false;
                                    refreshMenu();
                                    $location.path("/");
                                },
                                function(err) {}
                            );
                        }
                    }
                );
            } else {
                var modalInstance = $uibModal.open({
                    animation: true,
                    ariaLabelledBy: "modal-title-top",
                    ariaDescribedBy: "modal-body-top",
                    templateUrl: "/html/loginDialog.html",
                    controller: "loginDialog",
                    controllerAs: "ctrl"
                });
                modalInstance.result.then(function(data) {
                    globals.email = data.email;
                    globals.isAdmin = data.isAdmin;
                    ctrl.loggedOut = false;
                    refreshMenu();
                    $location.path("/");
                });
            }
        };

        //MOJE
        ctrl.register = function() {
            var modalInstance = $uibModal.open({
                animation: true,
                ariaLabelledBy: "modal-title-top",
                ariaDescribedBy: "modal-body-top",
                templateUrl: "/html/registerDialog.html",
                controller: "registerDialog",
                controllerAs: "ctrl"
            })
        }

        ctrl.closeAlert = function() {
            ctrl.alert.text = "";
        };
    }
]);

app.service("common", [
    "$uibModal",
    "globals",
    function($uibModal, globals) {
        this.confirm = function(confirmOptions, callback) {
            var modalInstance = $uibModal.open({
                animation: true,
                ariaLabelledBy: "modal-title-top",
                ariaDescribedBy: "modal-body-top",
                templateUrl: "/html/confirm.html",
                controller: "Confirm",
                controllerAs: "ctrl",
                resolve: {
                    confirmOptions: function() {
                        return confirmOptions;
                    }
                }
            });

            modalInstance.result.then(
                function() {
                    callback(true);
                },
                function(ret) {
                    callback(false);
                }
            );
        };

        this.alert = { text: "", type: "" };

        this.showMessage = function(msg) {
            this.alert.type = "alert-success";
            this.alert.text = msg;
        };

        this.showError = function(msg) {
            this.alert.type = "alert-danger";
            this.alert.text = msg;
        };

        this.stamp2date = function(stamp) {
            return new Date(stamp).toLocaleString();
        };
    }
]);
