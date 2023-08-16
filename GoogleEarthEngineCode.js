

//Example referring to the Sabah region for the year 2020

// Load Hansen Global Forest Change dataset
var image = ee.Image("UMD/hansen/global_forest_change_2021_v1_9");

// Load GAUL simplified level 1 dataset
var GAUL = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1');

// Filter for Malaysia
var malaysia = GAUL.filter(ee.Filter.eq('ADM0_NAME', 'Malaysia'));

// Filter for Region
var region = malaysia.filter(ee.Filter.eq('ADM1_NAME', 'Sabah'));

// Visualization parameters for the forest change map
var imageVisParam = {"opacity":1,"bands":["lossyear"],"gamma":1};

// Get the geometry of the region
var geometry = region.geometry();

// Clip the forest change map to the region of interest
var image = image.select(['lossyear']).clip(geometry);

// Generate a list of years to iterate over
var years = ee.List.sequence(1,21);

// Iterate over each year to compute the area of forest loss
var masking = years.map(function(a){

  // Create a binary mask for the current year
  var mask = image.eq(ee.Number(a)).selfMask();

  // Compute the area of forest loss for the current year
  var h = mask.multiply(ee.Image.pixelArea());
  var cal = h.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: geometry,
    scale: 30,
    maxPixels:1e13        
  });

  // Add properties to the mask for the current year, including the area of forest loss
  return mask.set('area_m2', ee.Number(cal.get('lossyear'))) 
             .set('year', ee.String(ee.Number(a).add(2000).toInt()));
});
    
// Convert the list of masks to an image collection
var final_col = ee.ImageCollection.fromImages(masking);
    
// Get the image for the year 2020
var year = final_col.filterMetadata('year', 'equals', '2020').first();

// Convert the forest loss image to a vector
var year_vector = year.reduceToVectors({
  geometry: geometry,
  scale: 30,
  maxPixels: 1e13,
  reducer: ee.Reducer.countEvery(),
  geometryType: 'polygon',
  eightConnected: true,
  labelProperty: 'lossyear'
});


// IMPORTANT: The following part computes the calculation of the polygons, however it often presented issues due to GEE operations allowance 

/*
// Extract a table of the polygon size
var table = year_vector
  .map(function(feature) {
    // Compute the area of each polygon in hectares and add it as a property
    var area = feature.buffer(1).geometry().area();
    var area_ha = area.divide(10000);
    return feature.set('area_m2', area).set('area_ha', area_ha);
  })
  .select(['lossyear', 'area_m2', 'area_ha'])
  .reduceColumns({
    reducer: ee.Reducer.toList(3),
    selectors: ['lossyear', 'area_m2', 'area_ha']
  })
  .get('list')
  .getInfo();

// Print the table of polygon sizes to the console
print(table);

// Export the table to Drive as a CSV file
Export.table.toDrive({
  collection: ee.FeatureCollection(table.map(function(row) {
    return ee.Feature(null, {'lossyear': row[0], 'area_m2': row[1], 'area_ha': row[2]});
  })),
  description: 'Sabah_polygon_sizes_2020',
  fileFormat: 'CSV',
  folder:'Google Earth Engine'
});

*/

// Export Vector Shapefile
Export.table.toDrive({
  collection: year_vector,
  folder:'Google Earth Engine',
  description: 'Sabah_Vector_2020',
  fileFormat: 'SHP'
});


