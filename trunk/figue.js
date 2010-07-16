/*!
 * Figue v1.0.1
 *
 * Copyright 2010, Jean-Yves Delort
 * Licensed under the MIT license.
 *
 */


var figue = function () {


	function euclidianDistance (vec1 , vec2) {
		var N = vec1.length ;
		var d = 0 ;
		for (var i = 0 ; i < N ; i++)
			d += Math.pow (vec1[i] - vec2[i], 2)
		d = Math.sqrt (d) ;
		return d ;
	}

	function repeatChar(c, n) {
		var str = "";
		for (var i = 0 ; i < n ; i++)
			str += c ;
		return str ;
	}
	
	
	function generateDendogram(tree, sep, balanced) {
		var lines = new Array ;
		if (tree.isLeaf()) {
			var label = String(tree.label) ;
			var len = label.length ;
			var bar_ix = Math.floor (len / 2) ;
			lines.push ( repeatChar (" " , bar_ix) + "|" + repeatChar (" " , len-bar_ix-1) ) ;
			lines.push (label) ;
		} else {
			var left_dendo = generateDendogram(tree.left ,sep, balanced) ;
			var right_dendo = generateDendogram(tree.right, sep, balanced) ;
			var left_bar_ix = left_dendo[0].indexOf("|") ;
			var right_bar_ix = right_dendo[0].indexOf("|") ;
	
			// calculate position of new vertical bar
			var bar_ix =  left_bar_ix + Math.floor(( left_dendo[0].length - (left_bar_ix) + sep + (1+right_bar_ix)) / 2) ;
			
			// calculate nb of chars of each line
			var len = sep + right_dendo[0].length + left_dendo[0].length ;
			var line ;
		
			// add line with the new vertical bar
			lines.push(repeatChar (" " , bar_ix) + "|" + repeatChar (" " , len - bar_ix -1)) ;
			
			// add horizontale line to connect the vertical bars of the lower level
			lines.push(repeatChar (" " , left_bar_ix) + repeatChar ("_" , sep + (left_dendo[0].length -left_bar_ix) + right_bar_ix+1) + repeatChar (" " , (right_dendo[0].length -right_bar_ix-1))) ;
	
			// IF: the user want the tree to be balanced: all the leaves are at the same level
			// THEN: if the left and right subtrees have not the same depth, add extra vertical bars to the top of the smallest subtree
			if (balanced &&  (left_dendo.length != right_dendo.length)) {
				var shortest ;
				var longest ;
				if (left_dendo.length > right_dendo.length) {
					longest = left_dendo ;
					shortest = right_dendo ;
				} else {
					longest = right_dendo ;
					shortest = left_dendo ;
				}
				// repeat the first line containing the vertical bar
				header = shortest[0] ;
				var toadd = longest.length - shortest.length ;
				for (var i = 0 ; i < toadd ; i++) {
					shortest.splice (0,0,header) ;
				}
			}
		
			// merge the left and right subtrees
			for (var i = 0 ; i < Math.max (left_dendo.length , right_dendo.length) ; i++) {
				var left = "" ;
				if (i < left_dendo.length)
					left = left_dendo[i] ;
				else
					left = repeatChar (" " , left_dendo[0].length) ;
	
				var right = "" ;
				if (i < right_dendo.length)
					right = right_dendo[i] ;
				else
					right = repeatChar (" " , right_dendo[0].length) ;
				lines.push(left + repeatChar (" " , sep) + right) ;	
			}
		}
		
		return lines ;
	}
	
	function agglomerate (labels, vectors, distance, linkage) {
		var N = vectors.length ;
		var dMin = new Array(N) ;
		var cSize = new Array(N) ;
		var matrixObj = new figue.Matrix(N,N);
		var distMatrix = matrixObj.mtx ;

		// Initialize distance matrix and vector of closest clusters
		for (var i = 0 ; i < N ; i++) {
			dMin[i] = 0 ;
			for (var j = 0 ; j < N ; j++) {
				if (i == j)
					distMatrix[i][j] = Infinity ;
				else
					distMatrix[i][j] = distance(vectors[i] , vectors[j]) ;
	
				if (distMatrix[i][dMin[i]] > distMatrix[i][j] )
					dMin[i] = j ;
			}
		}
	
	
		// create leaves of the tree
		clusters = new Array(N) ;
		for (var i = 0 ; i < N ; i++) {
			clusters[i] = [] ;
			clusters[i][0] = new Node (labels[i], null, null, 0) ;
			cSize[i] = 1 ;
		}
		
		// Main loop
		var root ;
		for (var p = 0 ; p < N-1 ; p++) {
			// find the closest pair of clusters
			var c1 = 0 ;
			for (var i = 0 ; i < N ; i++) {
				if (distMatrix[i][dMin[i]] < distMatrix[c1][dMin[c1]])
					c1 = i ;
			}
			var c2 = dMin[c1] ;
	
			// create node to store cluster info 
			c1Cluster = clusters[c1][0] ;
			c2Cluster = clusters[c2][0] ;
			newCluster = new Node (-1, c1Cluster, c2Cluster , distMatrix[c1][c2]) ;
			clusters[c1].splice(0,0, newCluster) ;
			cSize[c1] += cSize[c2] ;
		
			// overwrite row c1 with respect to the linkage type
			for (var j = 0 ; j < N ; j++) {
				if (linkage == figue.SINGLE_LINKAGE) {
					if (distMatrix[c1][j] > distMatrix[c2][j])
						distMatrix[j][c1] = distMatrix[c1][j] = distMatrix[c2][j] ;
				} else if (linkage == figue.COMPLETE_LINKAGE) {
					if (distMatrix[c1][j] < distMatrix[c2][j])
						distMatrix[j][c1] = distMatrix[c1][j] = distMatrix[c2][j] ;
				} else if (linkage == figue.AVERAGE_LINKAGE) {
					var avg = ( cSize[c1] * distMatrix[c1][j] + cSize[c2] * distMatrix[c2][j])  / (cSize[c1] + cSize[j]) 
					distMatrix[j][c1] = distMatrix[c1][j] = avg ;
				}
			}
			distMatrix[c1][c1] = Infinity ;
			
			// infinity ­out old row c2 and column c2
			for (var i = 0 ; i < N ; i++)
				distMatrix[i][c2] = distMatrix[c2][i] = Infinity ;
	
			// update dmin and replace ones that previous pointed to c2 to point to c1
			for (var j = 0; j < N ; j++) {
				if (dMin[j] == c2)
					dMin[j] = c1;
				if (distMatrix[c1][j] < distMatrix[c1][dMin[c1]]) 
					dMin[c1] = j;
			}
	
			// keep track of the last added cluster
			root = newCluster ;
		}
	
		return root ;
	}
	

	function Matrix (rows,cols) 
	{
		this.rows = rows ;
		this.cols = cols ;
		this.mtx = new Array(rows) ; 

		for (var i = 0 ; i < rows ; i++)
		{
			var row = new Array(cols) ;
			for (var j = 0 ; j < cols ; j++)
				row[j] = 0;
			this.mtx[i] = row ;
		}
	}

	function Node (label,left,right,dist) 
	{
		this.label = label ;
		this.left = left ;
		this.right = right ;
		this.dist = dist ;
	}



	return { 
		SINGLE_LINKAGE: 0,
		COMPLETE_LINKAGE: 1,
		AVERAGE_LINKAGE:2 ,
		EUCLIDIAN_DISTANCE: euclidianDistance,

		Matrix: Matrix,
		Node: Node,
		generateDendogram: generateDendogram,
		agglomerate: agglomerate
	}
}() ;


figue.Matrix.prototype.toString = function() 
{
	var lines = [] ;
	for (var i = 0 ; i < this.rows ; i++) 
		lines.push (this.mtx[i].join("\t")) ;
	return lines.join ("\n") ;
}

figue.Node.prototype.isLeaf = function() 
{
	if ((this.left == null) && (this.right == null))
		return true ;
	else
		return false ;
}

figue.Node.prototype.buildDendogram = function (sep, balanced)
{
	lines = figue.generateDendogram(this, sep, balanced) ;
	return lines.join ("\n") ;	
}



