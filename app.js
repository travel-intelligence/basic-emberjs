var App = Ember.Application.create();

App.Adapter = DS.RESTAdapter.extend({
  namespace: 'api',
  url: "https://demo.travel-intelligence.com"
});
  
App.Adapter.registerTransform('object', {
  deserialize: function(value) { return value; }
});

App.Store = DS.Store.extend({
  revision: 11,
  adapter: 'App.Adapter'
});


//
// ============= Search Analysis ===========
//

//
// Models
//
App.SsTimeEvolution = App.STimeEvolution.extend({});
App.StTimeEvolution = App.STimeEvolution.extend({});

App.STimeEvolution = DS.Model.extend({
  market: DS.attr('string'),
  onds: DS.attr('object'),
  time_evolution: DS.attr('object'),
  day_distribution: DS.attr('object')
});


//
// Controllers
//

/**
 * Parent controller of StTimeEvolutionController and 
 * SsTimeEvolutionController.
 * 
 * The child controllers have to define:
 * - isLoading attribute
 * - model attribute
 **/
 
App.SearchTimeEvolutionAbstractController = Ember.Controller.extend({

  // Binding attributes
  market: "",
  onds: "",
  
  isLoading: Ember.Object.create( { value: false } ),
  
  // Other attributes
  model: null,        // To be defined in the child controllers
  
  // Property
  /**
   * filterOK equal true if the filter is correct, else false
   **/
  filterOK: function() {
    var market = this.get('market');
    if ( !market || market.length === 0 ) { return false; }
    var onds = this.get('onds');
    if ( !onds ) { return false; }
    onds = onds.split(",");
    var ondsOK = ( onds.length > 0 && onds.every( 
      function(item) {
        ond = item.split("-");
        return ond.length === 2 && 
               ( ond[0] === "*" || ond[0].length === 3 ) && 
               ( ond[1] === "*" || ond[1].length === 3 );
      }    
    ) );
    return ondsOK;
  }.property('market', 'onds'),
  
  // Methods
  
  /**
   * Set isLoading attribute to true if data are being loading,
   * else to false.
   **/  
   
  setLoading: function() {
    var isLoading = ( this.get('filterOK') && !(this.get('content.isLoaded')) );
    this.set("isLoading.value", isLoading);
  }.observes('market', 'onds','content.isLoaded'),
  
  
  /**
   * Load the data when the form is complete.
   * The two selected months are reordered. 
   **/

  loadSearchTimeEvolution: function() {
    if ( this.get('filterOK') ) {
      var model = this.get('model');  
      var onds = this.get('onds');
      var market = this.get('market');
      var time_evolution = model.find({
          market: market,
          onds: onds,
      });
      this.set('content', time_evolution);
    }
  }.observes('market', 'onds')
  
});

/**
 * Controller of the analyses "Fare Search: Time Evolution".
 **/

App.SearchTimeEvolutionController = Ember.Controller.extend({
  
  needs: ['ss_time_evolution', 'st_time_evolution'],
  
  title: 'Fare Search: Patterns Analysis',
  
  // Online help
  onlineHelp : true,
  information : '<ul><li>Time evolution of number of search queries \
                 based on search date and based on travel data.\
                 <li>Average number of queries for each day \
                 of the week, based on search date and base on \
                 departure date.</ul>',
  marketHelp : 'Market where the search queries have been done from, \
                based on the Amadeus office ID used for the query.',
  
  // Inputs of the form

  market: Ember.Object.create({
    selected: null,
    content: []
  }),
  ondsSelection: Ember.Object.create({
    selected: "Specify",
    content: ["Specify"]
  }),
  origin: "*",
  destination: "*",
  
  // isLoading attributes
  
  ssLoadingBinding:'controllers.ss_time_evolution.isLoading.value',
  stLoadingBinding:'controllers.st_time_evolution.isLoading.value',
  
  // Property
  
  /**
   * isLoading property equal true if data are being loaded.
   **/
    
  isLoading: function() {
    // Data are being loaded if ss data or st data are being loaded.
    var ssLoading = this.get('ssLoading');
    var stLoading = this.get('stLoading');
    return (ssLoading || stLoading);
  }.property('ssLoading', 'stLoading'),
  
  /**
   * useSpecifyCities equal true if Specify ondsSelection is selected else false
   **/
  useSpecifyCities: function() {
    return this.get('ondsSelection.selected') === "Specify";
  }.property('ondsSelection.selected'),
  
  /**
   * return selected onds
   **/
  onds: function() {
    var onds = "";
    var ondsSelection = this.get('ondsSelection.selected') || "";
    if ( ondsSelection === "Specify" ) {// Specify origin and destination
      var origin = this.get('origin') || "";
      var destination = this.get('destination') || "";
      onds = origin + "-" + destination;
    } else {// Favorite onds
      var userFav = App.Auth.get("user.search_favorites") || [];
      var onds = userFav.find( 
        function(item){ return item["name"] === ondsSelection; }
      );
      onds = (onds) ? onds["onds"].join(",") : "";
      onds = onds.toUpperCase();
    }
    return onds;
  }.property('market.selected', 'ondsSelection.selected', 
             'origin', 'destination'),
   
  
  // Methods
  
  /**
   * Load available markets from the database
   **/
  loadSearchMarkets: function() {
    var markets = App.searchMarketsController.getMarketNames() || [];
    this.set('market.content', markets);
    if (!this.get('market.selected') && markets.length > 0) {
      this.set('market.selected', markets[0])
    }
  }.observes('App.searchMarketsController.content.@each'),
   
  
  /**
   * Set the favorites selector with the favorites of the user. 
   **/
  
  loadFavorites: function() {
    var fav = App.Auth.get("user.search_favorites") || [];
    var favNames = fav.map(function(item){ return item["name"] });
    this.set('ondsSelection.content',["Specify"].concat(favNames));
    var ondsSelection = this.get('ondsSelection.selected');
    if (favNames.indexOf(ondsSelection) === -1){
      this.set('ondsSelection.selected', "Specify");
    }
  }.observes("App.Auth.user.search_favorites"),
  
  
  /**
   * Update ss_time_evolutions and st_time_evolutions controllers
   **/
  updateControllers: function() {
    ['controllers.ss_time_evolution',
     'controllers.st_time_evolution'].forEach(function(ctrl) {
      this.get(ctrl).set('market', this.get('market.selected'));
      this.get(ctrl).set('onds', this.get('onds'));
    }, this)
  }.observes('market.selected', 'onds'),


});

/**
 * Controller of StTimeEvolution 
 * dealing with Search Time Evolution by Travel Period
 * and part of the analysis "Fare Search: Patterns Analysis"
 **/
 
App.StTimeEvolutionController = App.SearchTimeEvolutionAbstractController.extend({
  
  model: App.StTimeEvolution

});

/**
 * Controller of SsTimeEvolution 
 * dealing with Search Time Evolution by Search Period
 * and part of the analysis "Fare Search: Patterns Analysis"
 **/
App.SsTimeEvolutionController = App.SearchTimeEvolutionAbstractController.extend({
  
  model: App.SsTimeEvolution

});


//
// ========= Air Traffic ==========
//
App.Traffic = DS.Model.extend({
  origin: DS.attr('string'),
  destination: DS.attr('string'),
  level: DS.attr('string'),
  traffics: DS.attr('object'),
  airline_traffics: DS.attr('object'),
});

/*
 * Air Traffic year over year
 */
App.TrafficController = Ember.Controller.extend({
    
  level: Ember.Object.create({
    selected: "City",
    content: ["City", "Airport"]
  }),
  origin: "",
  destination: "",
  month: "",
  token: "",
  
  loadData: function() {
    var origin = this.get('origin');
    var destination = this.get('destination');
    var month = this.get('month');
    var level   = this.get('level.selected');
    var token = this.get('token');
    if (origin.length > 2 &&  destination.length > 2 && token.length > 5) {
      var data = App.Traffic.find({
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        level: level.slice(0, 4).toLowerCase(),
        month: month,
        auth_token: token
      });
      this.set('content', data);
    }
  }.observes ('origin', 'destination', 'level.selected', 'month', 'token')
});

App.YearOverYearChartView = Ember.View.extend({
  didInsertElement: function () {
    this.updateChart();
  },

  updateChart: function(){
    
    // If no data, return.
    var data = this.get("data");
    var length = (data && data.get('length')) || 0;
    if (length < 1 || data.objectAt(0).get("is_error")) {
      return;
    }
    
    // Data parameters
    var origin = data.objectAt(0).get("origin");
    var destination = data.objectAt(0).get("destination");
    var level = data.objectAt(0).get("level");
    var aggData = data.objectAt(0).get("traffics");
    var months = ["2008-12",
                  "2009-01","2009-02","2009-03","2009-04","2009-05",
                  "2009-06","2009-07","2009-08","2009-09","2009-10",
                  "2009-11","2009-12",
                  "2010-01","2010-02","2010-03","2010-04","2010-05",
                  "2010-06","2010-07","2010-08","2010-09","2010-10",
                  "2010-11","2010-12",
                  "2011-01","2011-02","2011-03","2011-04","2011-05",
                  "2011-06","2011-07","2011-08","2011-09","2011-10",
                  "2011-11","2011-12",
                  "2012-01","2012-02","2012-03","2012-04","2012-05",
                  "2012-06","2012-07","2012-08","2012-09","2012-10",
                  "2012-11","2012-12",
                  "2013-01","2013-02","2013-03","2013-04"];

    // Push year data
    
    var series = []
    
    var monthIndex = 0; var yearIndex = 0;
    
    while (monthIndex < months.length){
      var year = months[monthIndex].substr(0,4);
      var data = [];
      while (monthIndex < months.length && 
              months[monthIndex].substr(0,4) === year){
        monthNum = parseInt(months[monthIndex].substr(5,2), 10) - 1;
        data.push({x:monthNum, y:aggData[monthIndex]});
        monthIndex++;
      }
      series.push({name: year, data: data});
      yearIndex++;
    }
    console.log(series)
    var options = {
      chart: {
        renderTo : this.get('elementId'),
        type: 'spline',
      },
      
      title: {
        text: "Traffic year over year"
      },
      
      xAxis: {
        categories: [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ],
      },
      
      yAxis: {
        title: {
          text: 'Monthly traffic  (seats)'
        },
      },   
        
      plotOptions: {
        spline: {
          dashStyle: 'Dash',
          lineWidth: 1,
          marker:{
            symbol: 'circle',
            radius: 6
          },
          shadow: false
        }
      },
       

      series: series
    }

    var chart = this.get('chart');
    chart && chart.destroy();
    chart = new Highcharts.Chart(options);
    this.set('chart', chart);
  }.observes('data.@each.id')
});


//
// ============= Search Analysis ===========
//
/*
 * Search Analysis
 */
App.SearchTimeEvolutionChartView = Ember.View.extend({
  
  didInsertElement: function () {
    this.updateChart();
  },

  updateChart: function(){
    
    // Check if the data are available
    var data = this.get("data");
    var length = (data && data.get('length')) || 0;
    if (length < 1) {
      return;
    }

    // Get data
    var market = data.objectAt(0).get('market') || "";
    var onds = data.objectAt(0).get('onds') || [];
    var time_evolution = data.objectAt(0).get('time_evolution') || [];
    var dataType = this.get('dataType') || "";
    var smoothing = true;
        
    var ondFilter = "";
    if (onds.length === 1) {
      if ( onds[0].origin.length === 3 ) {
        ondFilter += " from " + onds[0].origin;
      }
      if ( onds[0].destination.length === 3 ) {
        ondFilter += " to " + onds[0].destination;
      }
    }
    
    var title = this.get('title') + ondFilter + 
                ' by ' + dataType + ' date (' + market + ')';
                      
    // Transform data
    var values = [];
    var categories = [];
    for (var i=0; i<time_evolution.length; i++){
      values.push( time_evolution[i][1] );
      categories.push( time_evolution[i][0] );
    }
    
    if (smoothing) {
      var average; var smoothedValues = [];
      for (var i = 0; i < values.length; i++){
        if (i < 3 || i >= values.length - 3) {
          smoothedValues.push( values[i] );
        } else {
          average = 0;
          for (var j = -3; j <= 3; j++){
            average += values[ i + j ];
          }
          smoothedValues.push( average / 7 );
        }
      }
      values = smoothedValues;
    }
    
    // Parameters for Export CSV 
    var csvFirstLine = ["#Day"]
    csvFirstLine.push("Searches<br>");
    csvFirstLine = csvFirstLine.join(";");

    // Chart options
    var options = {
      chart: {
        type: 'area',
        renderTo : this.get('elementId'),
        zoomType: 'xy',
        height: 330
      },
      credits: {
        enabled: false
      },
      title: {
          text: title
      },
      subtitle: {
          text: 'Sources: Fare search'
      },
      exporting:{
        buttons:{
          contextButton: {
            menuItems: [{
              text: 'Display CSV',
              onclick: function() {
                popCSV(title, csvFirstLine, time_evolution);
              }
            },{
              text: 'Download graph',
              onclick: function() {
                this.exportChart();
              }
            }]
          },
        }
      },
      xAxis: {
        title: {
            text: dataType + ' Day'
        },
        categories: categories,
        showLastLabel: true,
        labels: {
          step:Math.floor( categories.length / 15.),
          align: 'right',
          rotation: -45,
        },
        events: {
          setExtremes: function(event) {
            if (event.max) {
              var step = Math.floor((event.max - event.min) / 15.);
              this.options.labels.step = step;
            } else {
              var step = Math.floor(categories.length / 15.);
              this.options.labels.step = step;
            }
          }
        }
      },
      yAxis: {
        title: {
            text: 'Number of Searches'
        },
      },
      legend:{
        enabled:false,
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        formatter: function(){
          function str(i){
            if ( i > 1000 ) {
              return Math.round(i*10/1000)/10+ 'K';
            } else {
              return Math.round(i);
            }
          }
          var d = new Date(Date.parse(this.x));
          var m = ["Sunday", "Monday", "Tuesday", "Wednesday", 
                   "Thursday", "Friday", "Saturday"][d.getDay()]
          return '<b>' + this.x + '</b> ( ' + m + ' )<br>' + 
                 str(this.y);
        }        
      },
      plotOptions: {
        area: {
          lineWidth: 0.5,
          lineColor: "#1A61A9",
          color: "#5ba0e6",
          animation:false,
          marker: {
            enabled: false,
            symbol: 'circle',
            radius: 2,
            states: {
              hover: {
                enabled: true,
                lineWidth: 0.6 
              }
            }
          }
        }
      },
      series: [{
        name: "time evolution",
        data: values
      }]
    };
    
    var chart = this.get('chart');
    chart && chart.destroy();
    chart = new Highcharts.Chart(options);
    this.set('chart', chart);
  }.observes('data.content')
});


/*
 * Search Analysis - Highest variations
 */
App.FareSearchVariationsChartView = Ember.View.extend({
  
  didInsertElement: function () {
    this.updateChart();
  },

  updateChart: function(){
    
    // Check if the data are available
    var data = this.get("data");

    var length = (data && data.get('length')) || 0;
    if (length < 1) {
      return;
    }
    
    var title = this.get('title');
    var dataName = this.get('dataName');
    
    var fmonth = data.objectAt(0).get('fmonth');
    var smonth = data.objectAt(0).get('smonth');
    var market = data.objectAt(0).get('market');
    var marketName = data.objectAt(0).get('market_name');
    var variation = data.objectAt(0).get(dataName);
    
    var ind = ['TU', 'TS', 'TB'].indexOf(market);
    if (ind >= 0){
      market = ['TUI France', 'TUI Web', 'TUI B2B'][ind];
    }
    
    var series = [];
    var categories = [];
    var labels = [];
    
    var delta;
    
    var csvFirstLine = ["#" + title.split(" ")[0]]
    csvFirstLine.push("Average number of daily searches in " + fmonth);
    csvFirstLine.push("Average number of daily searches in " + smonth);
    csvFirstLine.push("Delta in %<br>");
    csvFirstLine = csvFirstLine.join(";");

    for (var i=0; i<Math.min(variation.length, 10); i++){
      series.push({
        y:variation[i][3], 
        name: variation[i][1]+';'+variation[i][2],
        market: marketName,
        ond: variation[i][0],
        value_p1: variation[i][1],
        value_p2: variation[i][2]
      });
      categories.push(variation[i][0]);
    }
    
    var options = {
      chart: {
        type: 'column',
        renderTo : this.get('elementId'),
        zoomType: 'xy',
        height: 330
      },
      credits: {
        enabled: false
      },
      title: {
          text: title + ' (' + market + ')'
      },
      subtitle: {
          text: 'Sources: Fare search ('+fmonth+' compared to '+smonth+')'
      },
      exporting:{
        buttons:{
          contextButton: {
            menuItems: [{
              text: 'Display CSV',
              onclick: function() {
                popCSV(title, csvFirstLine, variation);
              }
            },{
              text: 'Download graph',
              onclick: function() {
                this.exportChart();
              }
            }]
          },
        }
      },
      xAxis: {
        categories: categories,
          labels: {
            rotation: -45,
            align: 'right',
            style: {
              font: 'normal 11px Verdana, sans-serif'
            }
          }
      },
      yAxis: {
        title: {
            text: 'Fare search variation (%)'
        },
        labels: {
          formatter: function() {
            return this.value + '%';
          }
        }
      },
      legend: {
        enabled: false
      },
      tooltip: {
        hideDelay: 100,
        backgroundColor: '#FFFFFF',
        formatter: function(){
          var name = App.citiesController.getCityFromStore(this.x);
          return '<b>' + this.x + '</b><br>' +
          '<i>' + name + '</i><br>' +
          this.series.name + ': ' + 'Δ ' + this.y + '% <br>' +
          'Average number of daily searches: <br>' +
          '- ' + this.series.name.slice(0,7) + ': ' + 
          this.key.split(';')[0] + '<br>'+
          '- ' + this.series.name.slice(20) + ': ' + 
          this.key.split(';')[1];
        },  
        style:{
          width: '300px',
        }
      },
      plotOptions: {
        column: {
          color: '#1A61A9',
          pointPadding: 0.2,
          borderWidth: 0,
          animation:false,
        },
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: function() {
                var myController = this.series.chart.controller;
                var context = Ember.Object.create({
                  market: this.market,
                  ond: this.ond
                });
                myController.loadPatternsAnalysis(context);
              }
            }
          }
        }
      },
      series: [{
        name: fmonth + ' compared to ' + smonth,
        data: series
      }]
    };
    
    var chart = this.get('chart');
    chart && chart.destroy();
    chart = new Highcharts.Chart(options);
    chart.controller = this.get('controller');
    this.set('chart', chart);
  }.observes('data.@each.id')
});

/*
 * Search Analysis - advance purchase
 */
App.AdvancePurchaseChartView = Ember.View.extend({
  
  didInsertElement: function () {
    this.updateChart();
  },

  updateChart: function(){
    
    // Check if the data are available
    var data = this.get("data");

    var length = (data && data.get("length")) || 0;
    if (length < 1) {
      return;
    }
    
    // Get data
    var dataName = this.get("dataName");
    var market = data.objectAt(0).get("market");
    var onds = data.objectAt(0).get("onds");
    var total = data.objectAt(0).get("nb_req");
    var wOnly = data.objectAt(0).get("weekend_only");
    var advancePurchase = data.objectAt(0).get(dataName);
    
    // Period
    var firstDay = data.objectAt(0).get("first_day");
    var lastDay = data.objectAt(0).get("last_day");
    var ptype = data.objectAt(0).get('ptype');
    var period = data.objectAt(0).get('period');
    var periodExt = "";
    if (firstDay && lastDay) {
      periodExt = firstDay + "/" + lastDay + (wOnly ? " (weekend only)" : "");
    } else if (period && ptype) {
      fullName = {"y":"Year","q":"Quarter","m":"Month","w":"Week"};
      periodExt = period + " ("+fullName[ptype]+")";
    }
    
    // O&D filter
    var filter = "";
    if (onds.length === 1)  {
      if ( onds[0].origin.length === 3 ) {
        filter += " from " + onds[0].origin;
      }
      if ( onds[0].destination.length === 3 ) {
        filter += " to " + onds[0].destination;
      }
    }
    // Title
    var title = this.get("title") + filter + " (" + market + ")";
    
    // Transform data
    var categories = [];
    var advPurchTr = [];
    for (var i = 0; i < (advancePurchase.length - 1); i++){
      categories.push( i + "-" + (i+1) );
      advPurchTr.push({ y: advancePurchase[i] });
    }
    categories.push((advancePurchase.length - 1) + "+")
    advPurchTr.push({ 
      y:advancePurchase[advancePurchase.length - 1], 
      color: "#B3B3B3" 
    })  
    
    // Parameters for Export CSV 
    var csvFirstLine = ["#Advance purchase (weeks)"]
    csvFirstLine.push("Average number of daily searches<br>");
    csvFirstLine = csvFirstLine.join(";");
    csvData = []
    for (var i = 0; i < advancePurchase.length; i++){
      csvData.push( [categories[i],advancePurchase[i]] );
    }

    // Chart options
    var options = {
      chart: {
        type: "column",
        renderTo : this.get("elementId"),
        zoomType: "xy",
        height: 330
      },
      credits: {
        enabled: false
      },
      title: {
          text: title
      },
      subtitle: {
          text: "Sources: Fare search - "+ periodExt
      },
      exporting:{
        buttons:{
          contextButton: {
            menuItems: [{
              text: 'Display CSV',
              onclick: function() {
                popCSV(title, csvFirstLine, csvData);
              }
            },{
              text: 'Download graph',
              onclick: function() {
                this.exportChart();
              }
            }]
          },
        }
      },
      xAxis: {
        categories: categories,
        title: {
          text: "Weeks"
        },
        labels: {
          rotation: -45,
          align: "right",
          style: {
            font: "normal 11px Verdana, sans-serif"
          }
        }
      },
      yAxis: {
        title: {
            text: "Average Number Of Daily Searches"
        },
      },
      legend: {
        enabled: false,
      },
      tooltip: {
        backgroundColor: "#FFFFFF",
        formatter: function(){
          var perc = Math.round( 10 * 100 * this.y / total) / 10;
          function str(i){
            return i>1000 ? Math.round(i*10/1000)/10+ "K" : i;
          }
          return "<b>" + this.x + " weeks</b><br>" +
          str(this.y) + " ( "+ perc +"% )";
        }        
      },
      plotOptions: {
        column: {
          color: "#1A61A9",
          pointPadding: 0.2,
          borderWidth: 0,
          animation:false
        }
      },
      series: [{
        name: period,
        data: advPurchTr
      }]
    };
    
    var chart = this.get("chart");
    chart && chart.destroy();
    chart = new Highcharts.Chart(options);
    this.set("chart", chart);
  }.observes("data.@each.isLoaded")
});

/*
 * Search Analysis - Trip duration
 */
App.TripDurationChartView = Ember.View.extend({
  
  didInsertElement: function () {
    this.updateChart();
  },

  updateChart: function(){

    // Check if the data are available
    var data = this.get("data");
    var length = (data && data.get('length')) || 0;
    if (length < 1) {
      return;
    }
    
    // Get data
    data = data.objectAt(0);
    var market = data.get('market') || "";
    var onds = data.get('onds') || [];
    var period = data.get('period');
    var total = data.get("nb_req");
    var tripDuration = data.get("trip_duration");
    var wOnly = data.get("weekend_only");
    var d = data.get("dep_day");
    var r = data.get("ret_day");
    
    var ptype = ""
    if (wOnly){
      var ptype = " (weekend only)";
    }else if (data.get('ptype')) {
      fullName = {"y":"Year","q":"Quarter","m":"Month","w":"Week"};
      ptype = " ("+fullName[data.get('ptype')]+")";
    }
    
    var title = this.get('title');
    
    var filter = "";
    if (onds.length === 1)  {
      if ( onds[0].origin.length === 3 ) {
        filter += " from " + onds[0].origin;
      }
      if ( onds[0].destination.length === 3 ) {
        filter += " to " + onds[0].destination;
      }
    }
    
    // Transform data
    var categories = [];
    tripDur = [];
    for (var i = 0; i < (tripDuration.length - 1); i++){
      tripDur.push( tripDuration[i] );
      categories.push( i );
    }
    categories.push((tripDuration.length - 1) + "+")
    tripDur[tripDuration.length - 1] = {
      y: tripDuration[tripDuration.length - 1],
      color: "#B3B3B3"
    }
    
    // Parameters for Export CSV 
    var csvFirstLine = ["#Trip duration (days)"]
    csvFirstLine.push("Number of daily searches<br>");
    csvFirstLine = csvFirstLine.join(";");
    csvData = []
    for (var i = 0; i < tripDuration.length; i++){
      csvData.push( [categories[i],tripDuration[i]] );
    }
    
    if (wOnly) {     
      max = 4 - (d.indexOf("4") === -1 ? 1 : 0)
              - (d.indexOf("4") === -1 && d.indexOf("5") === -1 ? 1 : 0)
              - (r.indexOf("1") === -1 ? 1 : 0);
      min = 1 + (d.indexOf("6") === -1 ? 1 : 0)
              + (d.indexOf("6") === -1 && d.indexOf("5") === -1 ? 1 : 0)
              + (r.indexOf("0") === -1 ? 1 : 0);
      tripDur = tripDur.slice(min, max + 1);
      categories = categories.slice(min, max + 1);
    }
    


    // Chart options
    var options = {
      chart: {
        type: 'column',
        renderTo : this.get('elementId'),
        zoomType: 'xy',
        height: 330
      },
      credits: {
        enabled: false
      },
      title: {
          text: title + filter + ( market ? ' (' + market + ')' : '' )
      },
      subtitle: {
          text: 'Sources: Fare search - '+ period + ptype
      },
      exporting:{
        buttons:{
          contextButton: {
            menuItems: [{
              text: 'Display CSV',
              onclick: function() {
                popCSV(title, csvFirstLine, csvData);
              }
            },{
              text: 'Download graph',
              onclick: function() {
                this.exportChart();
              }
            }]
          },
        }
      },
      xAxis: {
        categories: categories,
        title: {
          text: 'Days'
        },
        labels: {
          rotation: -45,
          align: 'right',
          style: {
            font: 'normal 11px Verdana, sans-serif'
          }
        }
      },
      yAxis: {
        title: {
            text: 'Average Number Of Daily Searches'
        },
      },
      legend: {
        enabled: false,
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        formatter: function(){
          var perc = Math.round( 10 * 100 * this.y / total) / 10;
          function str(i){
            return i>1000 ? Math.round(i*10/1000)/10+ 'K' : i;
          }
          return '<b>' + this.x + ' days</b><br>' +
          str(this.y) + ' ( '+ perc +'% )';
        }        
      },
      plotOptions: {
        column: {
          color: '#1A61A9',
          pointPadding: 0.2,
          borderWidth: 0,
          animation:false
        }
      },
      series: [{
        name: period,
        data: tripDur
      }]
    };

    
    var chart = this.get('chart');
    chart && chart.destroy();
    chart = new Highcharts.Chart(options);
    this.set('chart', chart);
  }.observes('data.@each.isLoaded')
});
