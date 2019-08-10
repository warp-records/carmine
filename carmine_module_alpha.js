//Carmine prototype
//https://github.com/theultraman20/carmine
//By theultraman20
(function(){
    var colorFader = document.createElement("style");
    colorFader.innerText = "*{    -moz-transition:background-color 0.5s ease-in;    -o-transition:background-color 0.5s ease-in;    -webkit-transition:background-color 0.5s ease-in; }";
    //document.querySelector("head").appendChild(colorFader);
    

    var carmine = {};
    carmine.maxThemeCache = 5;//must be at least one
    carmine.cacheList = [];

    var cacheListString = [];
    var themeDataCache = [];
    var colorList;
    var numColors;
    var colorDataSet = {
            colorList: [],
            groupList: [],
        };

    //home - resonance ["#e57244", "#6a60db", "#4261de", "#89c2fd", "#e1f4fe"]
    //home - sun ["#d61ea2", "#ff5160", "#26211e"]

    var colorPropWeights = {
        c: 1,
        m: 1,
        y: 1,
        s: 0, 
        l: 0,
        lowSatBgFactor: 2,
        count: 5,
        size: 1
    };

    var colorModProps = {
        s: 0,
        l: 0,
        saturationDescaling: 0.1
    };
    
    var colorPropScales = {
        s: 1,
        l: 1
    };
        
    var bgNodeList = document.querySelectorAll(":not(html):not(script):not(link):not(title):not(meta)");
    var textNodeList = getTextNodes();
    var bgNodeLen = bgNodeList.length;
    var textNodeLen = textNodeList.length;
    var bgData, textData, largestColor;

    function getTextNodes(){
          var n, a=[], walk=document.createTreeWalker(document.querySelector("body"),NodeFilter.SHOW_TEXT,null,false);
          while(n=walk.nextNode()) {
            if (n.data !== " ") {
                a.push(n.parentElement);
            };
        };
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
    };

    function getMedian(array){
        var arrayLen = array.length;
        
        if (arrayLen%2==0) {//even
            return (array[arrayLen/2-1] + array[arrayLen/2])/2;
        } else {
            return array[(arrayLen-1)/2];
        };
    };

    function removeZeroes(array){
        var tmp;
        for (var i = array.length; !(tmp=array.pop()); --i);
        array.push(tmp);
        return array;
    };

    function getClosestColor(ogColorStr, colorUsageList) {//maybe add colorFormat option later? Also add a preanalyzation option for multiple colorLists
        var bgWeights = bgData.bgWeights;
        var medianBgWeight = bgData.medianBgWeight;
        var ogColorSatScale = bgWeights[bgData.colorList.indexOf(ogColorStr)] / medianBgWeight;//it's "saturation scale" based off of the median saturation
        
        var maxWeight = Math.max(... bgWeights);
        var ogColor = tinycolor(ogColorStr);
        var ogColorHsl = ogColor.toHsl();
        var ogColorCmyk = ogColor.toCmyk();
        var colorScores = [];
        var color, colorHsl, colorCmyk, closestColor;

        console.log(ogColorStr + " sat scale: " + ogColorSatScale + "\n");

        for (var i = 0; i < numColors; ++i) {
            colorHsl = tinycolor(colorList[i]).toHsl();
            colorCmyk = tinycolor(colorList[i]).toCmyk();
            
            colorScores[i] = scoreColor(['c', 'm', 'y'], ogColorCmyk, colorCmyk)/360;
            colorScores[i] += scoreColor(['s', 'l'], ogColorHsl, colorHsl);
            colorScores[i] += ogColorSatScale / maxWeight / (colorHsl.s/255) * colorPropWeights.lowSatBgFactor;
            colorScores[i] += colorUsageList[i] * colorPropWeights.count;//make sure colors aren't overused!
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
        var ogColorSize = bgData.bgWeights[bgData.colorList.indexOf(ogColor)];
        var maxColorSize = Math.max(... bgData.bgWeights);
        var ogHsl, desiredHsl, newColor;
        
        //determine a list of new colors to be used
        ogHsl = tinycolor(ogColor).toHsl();//background hsl model
        desiredHsl = tinycolor(desiredColor).toHsl();//hsl model of colorList color
        newColor = desiredHsl; 

        newColor.s *= Math.min(colorPropScales.s + colorModProps.s - ogColorSize/maxColorSize*colorModProps.saturationDescaling, 1);
        newColor.l *= Math.min(colorPropScales.l + colorModProps.l, 1)

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
                iterateCallback(node, index);
            };
        };

        colorDataHolder.groupList = organizedList;
        colorDataHolder.colorList = valuesList;
    };

    function getElemData() {//will calculate colordiffscales during elem data collection and slightly speed things up overall. should be used for first theme on page.
        bgData = Object.create(colorDataSet);
        bgData.bgWeights = [];
        bgData.borderColorList = [];
        bgData.medianBgWeight = 0;

        textData = Object.create(colorDataSet);
        textData.bgColorList = [];
        textData.textNodes = [];
        //add borders soon

        organizeNodeList(bgNodeList, bgData, "background-color", "rgba(0, 0, 0, 0)", 
        function(node, index){
            bgData.bgWeights.push(0)
        }, 
        function(node, index){
            var weight = node.offsetWidth*node.offsetHeight;

            bgData.borderColorList.push(getComputedStyle(node).getPropertyValue("border-top-color"));
            if (weight==weight) bgData.bgWeights[index] += weight;
        });

        organizeNodeList(textNodeList, textData, "color", "", function(bg){}, 
        function(node){
            var textNodeBg;//maybe later have it just store the color
            for (var bgNode = node; (textNodeBg=getComputedStyle(bgNode).getPropertyValue("background-color")) == "rgba(0, 0, 0, 0)"; bgNode = bgNode.parentElement) if (!bgNode.parentElement) break;
            textData.bgColorList.push(bgNode);
            textData.textNodes.push(node);
        });
        
        bgData.medianBgWeight = getMedian(removeZeroes(bgData.bgWeights.sort()));
    };

    function getThemeData(_colorList){
        var themeData;
        themeData = Object.create(colorDataSet);
        themeData.colorList = _colorList;
        themeData.bgColorList = [];
        themeData.borderColorList = [];
        themeData.textColorList = [];
        
        colorList = _colorList;
        numColors = colorList.length;
        colorPropScales = {
            s: 1,
            l: 1
        };
        var colorUsageList = Array(colorList.length).fill(0);//for getClosestColor();
        var textColors = ["black", "white"];//todo
        var bgColorList = bgData.colorList;
        var bgBorderColorList = bgData.borderColorList;
        //var textColorList = textData.colorList;
        var textBgColorList = textData.bgColorList;
        var bgNumGroups = bgData.groupList.length;
        var k = 0;
        var closestColor, colorDiffScales, bgGroupLen, bgColor, newColor;

        for (var i = 0; i < bgNumGroups; ++i) {
            bgColor = bgColorList[i];
            closestColor = getClosestColor(bgColor, colorUsageList)
            newColor = modColor(bgColor, closestColor);
            themeData.bgColorList.push(newColor);
            colorUsageList[colorList.indexOf(closestColor)]++;

            closestColor = getClosestColor(bgColor, colorUsageList);
            colorDiffScales = getColorDiffScales(bgColor, closestColor);
            if (colorDiffScales.s < colorPropScales.s) colorPropScales.s = colorDiffScales.s;
            if (colorDiffScales.l < colorPropScales.l) colorPropScales.l = colorDiffScales.l;

            for (var j = 0, bgGroupLen = bgData.groupList[i].length; j < bgGroupLen; ++j, ++k) {
                themeData.borderColorList.push(modBorderColor(bgColor, newColor, bgBorderColorList[k]));
            };
        };

        for (var i = 0; i < textNodeLen; ++i) {
            themeData.textColorList.push(
                tinycolor.mostReadable(themeData.bgColorList[bgColorList.indexOf(getComputedStyle(textBgColorList[i]).getPropertyValue("background-color"))], textColors).toHexString()
            );
        };
    
        if (carmine.maxThemeCache == themeDataCache.length) {
            themeDataCache.pop();
            cacheListString.pop();
            carmine.cacheList.pop();
        };

        themeDataCache.unshift(themeData);
        cacheListString.unshift(JSON.stringify(colorList));
        carmine.cacheList.unshift(colorList);

        //return themeData;
    };

    function themePage(theme){
        var themeData;
          
        if (typeof(theme)=="object") {
            themeData = themeDataCache[cacheListString.indexOf(JSON.stringify(theme))];
        } else {
            themeData = themeDataCache[theme];
        };
        
        colorList = themeData.colorList;
        numColors = colorList.length;
        var bgColorList = themeData.bgColorList;
        var borderColorList = themeData.borderColorList;
        /*var textGroupList = textData.groupList;
        var textNumGroups = textGroupList.length;*/
        var textNodeList = textData.textNodes;
        var textNodeListLen = textData.textNodes.length;
        var textColorList = themeData.textColorList;
        var groupList = bgData.groupList;
        var bgNumGroups = groupList.length;
        var k = 0;
        var currentGroup, currentGroupLen, currentElem;
        
        for (var i = 0; i < bgNumGroups; ++i) {
            currentGroup = groupList[i];
            for (var j = 0, currentGroupLen = currentGroup.length; j < currentGroupLen; ++j, ++k) {
                currentElem = currentGroup[j];
                currentElem.style.backgroundColor = bgColorList[i];
                currentElem.style.borderColor = borderColorList[k];
            };
        };

        //using the organized groups causes a bug since the nodes aren't ordered...

        /*for (var i = 0, k = 0; i < textNumGroups; ++i) {
            currentGroup = textGroupList[i];
            for (var j = 0, currentGroupLen = currentGroup.length; j < currentGroupLen; ++j, ++k) {
                currentGroup[j].style.color = textColorList[k];
            };
        };*/
        for (var i = 0; i < textNodeListLen; ++i) {
            textNodeList[i].style.color = textColorList[i];
        };

    };

    carmine.getElemData = getElemData;
    carmine.getThemeData = getThemeData;
    carmine.themePage = themePage;

    window.carmine = carmine;
    
    //-------------------------------------------------------------------------------

    /*if (!colorData){ 
        colorData = getColorData(colorList, colorPropWeights, colorModProps.colorChangeSync);
        document.querySelector("head").appendChild(colorFader); 
    }*/
})();

carmine.getElemData();
carmine.getThemeData(["#e57244", "#6a60db", "#4261de", "#89c2fd", "#e1f4fe"]);
//carmine.getThemeData(["#d61ea2", "#ff5160", "#26211e"]);
//carmine.getThemeData(["rgb(97, 38, 34)", "rgb(191, 169, 134)", "rgb(20, 147, 70)"]);

//test theme
//carmine.getThemeData(["#45207d", "#c21f79", "#252438"]);
carmine.themePage(0);
