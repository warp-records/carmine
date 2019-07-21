//Carmine prototype
//https://github.com/theultraman20/carmine
//By theultraman20, GNU General Public License

var bgNodeList = document.querySelectorAll(":not(html):not(script):not(link):not(title):not(meta)");
var textNodeList = getTextNodes();
var bgNodelen = bgNodeList.length;
var textNodeLen = textNodeList.length;
var colorDat, colorModProps, node;

function getTextNodes(){
  var n, a=[], walk=document.createTreeWalker(document.querySelector("body"),NodeFilter.SHOW_TEXT,null,false);
  while(n=walk.nextNode()) a.push(n);
  return a;
}
//big thanks to phrogz for this: https://stackoverflow.com/questions/10730309/find-all-text-nodes-in-html-page

function getColorData() {
    var allBgs = [];
    var allTextColors = [];
    var bgWeights = [];
    var bgWeightsOrdered = [];
    var elemGroups = [];
    var textGroups = [];
	var textNodeBgs = [];
    var elemGroupsOrdered = [];//ordered by "weight" property
    var node, bgNode, bg, textColor, style, oldBgWeights, weight, numBgs, index;

    for (var i = 0; i < bgNodelen; ++i) {
        node = bgNodeList[i];
        style = getComputedStyle(node);
        bg = style.getPropertyValue("background-color");
        weight = node.offsetWidth*node.offsetHeight;//calculate on-screen size

        //gather list of objects with same colors, and record data about their nodes
        if (bg && bg!="rgba(0, 0, 0, 0)") {//make sure it has a background element
            index = allBgs.indexOf(bg);
            if (index==-1) {
                index = allBgs.length;
                elemGroups[index] = [];
                allBgs.push(bg);
                bgWeights.push(0);
            };

            if (weight==weight) bgWeights[index] += weight;//make sure the weight isn't NaN
            elemGroups[index].push(node);
        };
    };

    for (var i = 0; i < textNodeLen; ++i) {
        node = textNodeList[i].parentElement;
        textColor = getComputedStyle(node).getPropertyValue("color");

        if (textColor != "") {
            index = allTextColors.indexOf(textColor);
            if (index==-1) {
                index = allTextColors.length;
                allTextColors.push(textColor);
                textGroups[index] = [];
            };
        	
            textGroups[index].push(node);
			for (bgNode = node; getComputedStyle(bgNode).getPropertyValue("background-color") != "rgba(0, 0, 0, 0)"; bgNode = bgNode.parentElement);
			textNodeBgs.push(getComputedStyle(bgNode).getPropertyValue("background-color"));
        };
    };
    
    oldBgWeights = [...bgWeights];
    numBgs = bgWeights.length;
    for (var i = 0; i < numBgs; ++i) {
        bgWeightsOrdered.push(bgWeights.splice(bgWeights.indexOf(Math.max(...bgWeights)), 1)[0]);
    };
    
    for (var i = 0; i < numBgs; ++i) {
        elemGroupsOrdered[i] = elemGroups[oldBgWeights.indexOf(bgWeightsOrdered[i])];
    }

    return [elemGroups, allBgs, textGroups, allTextColors, textNodeBgs]
};


/*color modification properties:
s: max change in saturation (0-1)
l: max change in light (0-1)
*/
function modColor(ogColor, desiredColor, colorModProps){
    var ogHsl, desiredHsl, newColor;
    
    //determine a list of new colors to be used
    ogHsl = tinycolor(ogColor).toHsl();//background hsl model
    desiredHsl = tinycolor(desiredColor).toHsl();//hsl model of colorList color
    newColor = desiredHsl; 
	//if (ogHsl.s == 0) return ogColor;
    
    //create the new color saturation and light, but only within the specified range
    newColor.s = Math.abs(ogHsl.s-Math.min(colorModProps.s, Math.abs(ogHsl.s-desiredHsl.s)));
    newColor.l = Math.abs(ogHsl.l-Math.min(colorModProps.l, Math.abs(ogHsl.l-desiredHsl.l)));
    
    //};
    
    return tinycolor(newColor).toHexString();
};


/*
property weights:
{
h: 1,
s: 1,
l: 1,
etc...
}
*/
function getClosestColor(ogColorStr, colorList, colorPropWeights, colorUsageList) {//maybe add colorFormat option later?
    var ogColor = tinycolor(ogColorStr);
    var ogColorHsl = ogColor.toHsl();
    var ogColorCmyk = ogColor.toCmyk();
    var numColors = colorList.length;
    var colorScores = [];
    var color, colorHsl, colorCmyk, closestColor;
    
    for (var i = 0; i < numColors; ++i) {
        colorHsl = tinycolor(colorList[i]).toHsl();
        colorCmyk = tinycolor(colorList[i]).toCmyk();
        colorScores[i] = (Math.abs(ogColorCmyk.c-colorCmyk.c)+Math.abs(ogColorCmyk.m-colorCmyk.m)+Math.abs(ogColorCmyk.y-colorCmyk.y))/360*colorPropWeights.h+Math.abs(ogColorHsl.s-colorHsl.s)*colorPropWeights.s+Math.abs(ogColorHsl.l-colorHsl.l)*colorPropWeights.l+colorUsageList[i]*colorPropWeights.count;//make sure colors aren't overused!

        /*console.log("\n=========================\n"+colorList[i].toUpperCase() + " COLOR SCORE DATA: ");
        console.log("   Cmyk score: " + (Math.abs(ogColorCmyk.c-colorCmyk.c)+Math.abs(ogColorCmyk.m-colorCmyk.m)+Math.abs(ogColorCmyk.y-colorCmyk.y))/360*colorPropWeights.h);
        console.log("   Saturation score: " + Math.abs(ogColorHsl.s-colorHsl.s)*colorPropWeights.s);
        console.log("   Luminance score: " + Math.abs(ogColorHsl.l-colorHsl.l)*colorPropWeights.l);
        console.log("TOTAL: " + colorScores[i]);*/
    };

    closestColor = colorList[colorScores.indexOf(Math.min(...colorScores))];
    
    return closestColor;
};

function getBestTextColor(textNode){
    //todo
};

//MAIN FUNCTION------------------------------------------------------

//tinycolor.mostReadable("#ff0088", ["#2e0c3a"],{includeFallbackColors:true,level:"AAA",size:"small"}).toHexString()

function themePage(elemGroups, bgs, textGroups, textColors, textNodeBgs, colorList, colorModProps, colorPropWeights) {
    var numColors = colorList.length;
    var elemNewColors = [];
	var textNewColors = [];
	textColors.push("black", "white");
    var colorUsageList = Array(numColors).fill(0);
	var k = 0;
    var closestColor, finalColor;

    for (var i = 0; i < elemGroups.length; ++i) {
        closestColor = getClosestColor(bgs[i], colorList, colorPropWeights, colorUsageList);
        elemNewColors[i] = modColor(bgs[i], colorList[i], colorModProps);
        colorUsageList[colorList.indexOf(closestColor)]++;
    };	

	for (var i = 0; i < textNodeBgs.length; ++i) {    
        textNewColors[i] = tinycolor.mostReadable(textNodeBgs[i], textColors, {includeFallbackColors:false,level:"AAA",size:"small"}).toHexString()
    };
    
    //set everything to their new colors!
    for (var i = 0; i < elemGroups.length; ++i) {
        for (var j = 0; j < elemGroups[i].length; ++j) {
            elemGroups[i][j].style.backgroundColor = elemNewColors[i];
        };
    };

	for (var i = 0; i < textGroups.length; ++i) {
        for (var j = 0; j < textGroups[i].length; ++j,++k) {
            textGroups[i][j].style.color = textNewColors[k];
        };
    };

};



//-------------------------------------------------------------------------------
colorData = getColorData();

colorModProps = {
    s: 1,
    l: 1
};
/*
How much flexibility the color changing 
algorithm has when changing properties
of the colors. Can be 0-1. 
*/
colorPropWeights = {
    h: 1, 
    s: 0, 
    l: 0, 
    count: 0
};
/*
How much each property matters when
trying to find the closest theme color to 
another color on the web page. The "count"
variable will lower the chances of a color
being chosen, to prevent theme colors from
being overused.
*/

themePage(colorData[0], colorData[1], colorData[2], colorData[3], colorData[4], ["red", "blue", "yellow"], colorModProps, colorPropWeights);//Like the Starboy album art!
