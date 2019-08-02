//Carmine prototype
//https://github.com/theultraman20/carmine
//By theultraman20, GNU General Public License
(function(){
    /*var colorFader = document.createElement("style");
    colorFader.innerText = "*{    -moz-transition:background-color 1s ease-in;    -o-transition:background-color 1s ease-in;    -webkit-transition:background-color 1s ease-in; }"*/
    var carmine = {};
    carmine.maxThemeCache = 1;//must be at least one
    carmine.earlyClosestColorCalc = true;//slightly speed things up.

    var themeDataCache = [];

    var colorDataSet = {
            colorList: [],
            groupList: [],
        };

    var colorList = ["#e57244", "#6a60db", "#4261de", "#89c2fd", "#e1f4fe"];//home - resonnance

    var colorPropWeights = {
        h: 1, 
        s: 0, 
        l: 0, 
        count: 5,
        size: 1
    };
    var colorModProps = {
        s: 1,
        l: 1,
        colorChangeSync: true//slightly slower but WAY cooler!
    };
        
    var bgNodeList = document.querySelectorAll(":not(html):not(script):not(link):not(title):not(meta)");
    var textNodeList = getTextNodes();
    var bgNodelen = bgNodeList.length;
    var textNodeLen = textNodeList.length;
    var numColors = colorList.length;
    var colorUsageList = Array(colorList.length).fill(0);//for getClosestColor();
    var colorPropScales = {
        s: 1,
        l: 1
    };
    var bgData, textData, themeData, colorData;

    function getTextNodes(){
      var n, a=[], walk=document.createTreeWalker(document.querySelector("body"),NodeFilter.SHOW_TEXT,null,false);
      while(n=walk.nextNode()) a.push(n.parentElement);
      return a;
    };
    //big thanks to phrogz for this: https://stackoverflow.com/questions/10730309/find-all-text-nodes-in-html-page

    function scoreColor(props, ogColor, listedColor){
        var score = 0;
        var propsLen = props.length;
        var prop;

        for (var i = 0; i < propsLen; ++i) {
            prop = props[i];
            score += Math.abs(ogColor[prop] - listedColor[prop])*colorPropWeights[prop];
        };

        return score;
    }

    function getClosestColor(ogColorStr) {//maybe add colorFormat option later? Also add a preanalyzation option for multiple colorLists
        var ogColor = tinycolor(ogColorStr);
        var ogColorHsl = ogColor.toHsl();
        var ogColorCmyk = ogColor.toCmyk();
        var colorScores = [];
        var color, colorHsl, colorCmyk, closestColor;

        for (var i = 0; i < numColors; ++i) {
            colorHsl = tinycolor(colorList[i]).toHsl();
            colorCmyk = tinycolor(colorList[i]).toCmyk();

            colorScores[i] = scoreColor(['c', 'm', 'y'], ogColorCmyk, colorCmyk)/360;
            colorScores[i] += scoreColor(['s', 'l'], ogColorHsl, colorHsl);
            colorScores[i] += colorUsageList[i]*colorPropWeights.count;//make sure colors aren't overused!

        };

        closestColor = colorList[colorScores.indexOf(Math.min(...colorScores))];

        return closestColor;
    };

    function getColorDiffScales(ogColor, desiredColor){
        var ogHsl, desiredHsl;
        ogHsl = tinycolor(ogColor).toHsl();
        desiredHsl = tinycolor(desiredColor).toHsl(); 

        return {
            s: desiredHsl.s/ogHsl.s,
            l: desiredHsl.l/ogHsl.l
        }
    };

    /*color modification properties:
    s: max change in saturation (0-1)
    l: max change in light (0-1)

    */
    function modColor(ogColor, desiredColor){
        var ogHsl, desiredHsl, newColor

        //determine a list of new colors to be used
        ogHsl = tinycolor(ogColor).toHsl();//background hsl model
        desiredHsl = tinycolor(desiredColor).toHsl();//hsl model of colorList color
        newColor = desiredHsl; 

        newColor.s*=colorPropScales.s*colorModProps.s;
        newColor.l*=colorPropScales.l*colorModProps.l;

        return tinycolor(newColor).toHexString();
    };

    function modBorderColor(ogBgColor, newBgColor, oldBorderColor){
        var ogHsl, newHsl, oldBorderHsl, newBorder;

        ogBgHsl = tinycolor(ogBgColor).toHsl();
        newBgHsl = tinycolor(newBgColor).toHsl();
        oldBorderHsl = tinycolor(oldBorderColor).toHsl();
        newBorder = oldBorderHsl;

        newBorder.h = ogBgHsl.h-oldBorderHsl.h+newBgHsl.h;
        newBorder.s = ogBgHsl.s-oldBorderHsl.s+newBgHsl.s;
        newBorder.l = ogBgHsl.l-oldBorderHsl.l+newBgHsl.l;

        return tinycolor(newBorder).toHexString();
    };

    function organizeNodeList(nodeList, colorDataHolder, property, skipValue, newValueFoundCallback, iterateCallback){
        var organizedList = [];
        var valuesList = [];
        var listLen = nodeList.length;
        //var propertyListLen = propertyList.length;
        var node, style, propValue, index;

        for (var i = 0; i < nodeList.length; ++i) {
            node = nodeList[i];
            style = getComputedStyle(node);
            propValue = style.getPropertyValue(property);
            
            if (propValue && propValue != skipValue) {
                index = valuesList.indexOf(propValue);
                if (index == -1) {
                    index = organizedList.length;
                    organizedList[index] = [];
                    valuesList.push(propValue);
                    newValueFoundCallback(propValue);
                };

                organizedList[index].push(node);
                iterateCallback(node);
            };
        };

        colorDataHolder.groupList = organizedList;
        colorDataHolder.colorList = valuesList;
    };

    function getElemData() {//will calculate colordiffscales during elem data collection and slightly speed things up overall. should be used for first theme on page.
        bgData = Object.create(colorDataSet);
        bgData.borderColorList = [];
        bgData.newBgColorList = [];
        bgData.newBorderColorList = [];

        textData = Object.create(colorDataSet);
        textData.bgColorList = [];
        //add borders soon

        organizeNodeList(bgNodeList, bgData, "background-color", "rgba(0, 0, 0, 0)", 
        function(bg){
            //just leave it for now...
                var closestColor = getClosestColor(bg);//just leave it for now
                var colorDiffScales = getColorDiffScales(bg, closestColor);

                if (colorDiffScales.s < colorPropScales.s) colorPropScales.s = colorDiffScales.s;
                if (colorDiffScales.l < colorPropScales.l) colorPropScales.l = colorDiffScales.l;
        }, 
        function(node){
            bgData.borderColorList.push(getComputedStyle(node).getPropertyValue("border-top-color"));
        });

        organizeNodeList(textNodeList, textData, "color", "", function(bg){}, 
        function(node){
            var textNodeBg;//maybe later have it just store the color
            for (var bgNode = node; (textNodeBg=getComputedStyle(bgNode).getPropertyValue("background-color")) == "rgba(0, 0, 0, 0)"; bgNode = bgNode.parentElement) if (!bgNode.parentElement) break;
            textData.bgColorList.push(bgNode);
        });

    };

    function generateThemeData(){
        themeData = Object.create(colorDataSet);
        themeData.bgColorList = [];
        themeData.borderColorList = [];
        themeData.textColorList = [];
        
        var textColors = ["black", "white"];//todo
        var bgColorList = bgData.colorList;
        var bgBorderColorList = bgData.borderColorList;
        //var textColorList = textData.colorList;
        var textBgColorList = textData.bgColorList;
        var k = 0;
        var closestColor, bgGroupLen, bgColor, newColor;

        for (var i = 0; i < bgNodeLen; ++i) {
            bgColor = bgColorList[i];
            closestColor = getClosestColor(bgColor)
            newColor = modColor(bgColor, closestColor);
        
            themeData.bgColorList.push(newColor);
            colorUsageList[colorList.indexOf(closestColor)]++;
            for (j = 0, bgGroupLen = bgData.groupList[i].length; j < bgGroupLen; ++j, ++k) {
                themeData.borderColorList.push(modBorderColor(bgColor, newColor, bgBorderColorList[k]))
            };
        };

        for (var i = 0; i < textNodeLen; ++i) {
            themeData.textColorList.push(tinycolor.mostReadable(textBgColorList[i], textColors, {includeFallbackColors:false,level:"AAA",size:"small"}).toHexString())
        };
    
        if (carmine.maxThemeCache == themeDataCache.length) themeDataCache.pop();

        themeDataCache.unshift(themeData);
        return themeData;
    };

    //MAIN FUNCTION------------------------------------------------------

    function themePage() {
        var textColor = [];//todo
        textColors.push("black", "white");
        textColors.push(colorList);
        var k = 0;
        var closestColor, finalColor;

        for (var i = 0; i < elemGroups.length; ++i) {
            //console.log("============================\n" + tinycolor(bgs[i]).toRgbString());
            closestColor = getClosestColor(bgs[i], colorList, colorPropWeights, colorUsageList);

            elemNewColors[i] = modColor(bgs[i], closestColor, colorModProps, colorPropScales);
            colorUsageList[colorList.indexOf(closestColor)]++;
            for (j = 0; j < elemGroups[i].length; ++j, ++k) {
                elemBorderNewColors.push(modBorderColor(bgs[i], elemNewColors[i]), elemBorders[k])
            };
        };

        k = 0;//reset k for the text coloring
        //set everything to their new colors!
        for (var i = 0; i < elemGroups.length; ++i) {
            for (var j = 0; j < elemGroups[i].length; ++j) {
                elemGroups[i][j].style.backgroundColor = elemNewColors[i];
                elemGroups[i][j].style.borderColor = elemBorderNewColors[k];
            };
        };

        for (var i = 0; i < textNodeBgs.length; ++i) {
            textNewColors[i] = tinycolor.mostReadable(getComputedStyle(textNodeBgs[i]).getPropertyValue("background-color"), textColors, {includeFallbackColors:false,level:"AAA",size:"small"}).toHexString()
        };

        k = 0;
        for (var i = 0; i < textGroups.length; ++i) {
            for (var j = 0; j < textGroups[i].length; ++j, ++k) {
                textGroups[i][j].style.color = textNewColors[k];
            };
        };

    };


    //-------------------------------------------------------------------------------

    /*if (!colorData){ 
        colorData = getColorData(colorList, colorPropWeights, colorModProps.colorChangeSync);
        document.querySelector("head").appendChild(colorFader);
    }*/


    /*themePage(colorData[0], colorData[1], colorData[2], colorData[3], colorData[4], colorData[5], colorData[6], colorData[7], colorList, colorModProps, colorPropWeights);*/
}();
