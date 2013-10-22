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

App.Traffic = DS.Model.extend({
  origin: DS.attr('string'),
  destination: DS.attr('string'),
  level: DS.attr('string'),
  traffics: DS.attr('object'),
  airline_traffics: DS.attr('object'),
});

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
