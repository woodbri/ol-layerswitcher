# addcontrol

This adds the ability to inject a control into a layerswitcher layer group that can modify the the layer under that group. For example I have a group of seven layers and each of these layers can take one of six LAYER. So instead of having 42 layers I inject a SELECT control in to the group with the 6 LAYER options and when the select changes all the child layers get their LAYERS option updated to the selected control. The control injection is done here:

```
        new LayerGroup({
           title: 'Forecast Tomorrow',
           fold: 'close',
           addcontrol: {
               type: 'select',
               title: 'Depth',
               id: 'hycom_depth_2',
               classes: 'ol-layerswitcher-control',
               options: ['0','10','20','30','50','100'],
               change: function(id) {
                   var val = document.getElementById(id).value;

                   // remember value for the next time panel is rendered
                   localStorage[id] = val;

                   for(let lyr of this) {
                       var p = lyr.get('source').getParams();
                       p.LAYERS = val;
                       lyr.get('source').updateParams(p);
                   }
               }
           },
           layers: [
               new TileLayer({
                    title: 'Temperature',
                    type: 'overlay',
                    visible: false,
                    source: new TileWMS({
                        projection: 'EPSG:4326',
                        url: 'https://example.com/cgi-bin/mapserv?map=/maps/wms/hycom_temp_2.map',
                        params: {
                            'LAYERS': '0',
                            'format': 'image/jpeg',
                            'version': '1.3.0'
                        }
                    })
                }),
                ...
```

And after the map layers have been defined I initial localStorage like:

```
// When the page is (re)loaded initial the added controls value to keep things in sync
localStorage['hycom_depth_2'] = '0';
```

In the example about I change the LAYERS option, but could have changed any other param as needed like a ``depth`` params like so:

```
   var p = lyr.get('source').getParams();
   p['depth'] = val;
   lyr.get('source').updateParams(p);
```

Multiple controls can be added by making it an array of objects, like:

```
    addcontrol: [
        { /* control 1 */ },
        { /* control 2 */ },
        ...
    ]
```

## Bugs and Enhancements

* Currently the select control acts wierd with the mouse
* Only SELECT control is implemented, additional code can be added to inject out input controls
* There is probably a better way to do this, may be creating the control in user space and passing it via the layersSwitcher definition object.


