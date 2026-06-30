#!/usr/bin/env python3
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrow, Circle, Polygon
from matplotlib.lines import Line2D

CHAR="#16140F"; CORAL="#D8532E"; CREAM="#EFE7D6"; GREY="#9a8f78"; INK="#1d1a14"

fig,(axF,axS)=plt.subplots(1,2,figsize=(13.5,7.6),gridspec_kw={'width_ratios':[2.3,1]})
fig.patch.set_facecolor("white")

def dim(ax,x0,y0,x1,y1,label,off=0.0,vert=False):
    ax.annotate("",xy=(x1,y1),xytext=(x0,y0),
        arrowprops=dict(arrowstyle="<->",color=GREY,lw=1.1))
    mx,my=(x0+x1)/2,(y0+y1)/2
    if vert:
        ax.text(mx-0.25+off,my,label,rotation=90,va="center",ha="right",
                fontsize=10,color=INK)
    else:
        ax.text(mx,my+0.12+off,label,va="bottom",ha="center",fontsize=10,color=INK)

# ============ FRONT ELEVATION ============
axF.set_title("Front elevation",fontsize=13,color=CHAR,fontweight="bold",loc="left",pad=12)
# tray/base unit width 6, overall height 10; header 6w x 4h (y6-10); tray y0-6
# header placard
axF.add_patch(Rectangle((0,6),6,4,facecolor=CREAM,edgecolor=CHAR,lw=1.6))
axF.text(2.55,8.35,"KIMORA",fontsize=20,fontweight="bold",color=CHAR,ha="center",va="center")
# crest blob (octopus+bear suggestion)
axF.text(4.55,8.35,"⏺",fontsize=10,color=CORAL,ha="center",va="center")
axF.add_patch(Circle((4.55,8.35),0.62,facecolor="none",edgecolor=CORAL,lw=1.4))
axF.text(4.55,7.7,"bear +\noctopus\ncrest",fontsize=6.5,color=CORAL,ha="center",va="center")
axF.text(2.7,7.5,"CREATINE + ELECTROLYTES",fontsize=6.5,color=CHAR,ha="center")
axF.add_patch(Rectangle((4.95,6.35),0.85,0.85,facecolor="white",edgecolor=CHAR,lw=1))
axF.text(5.37,6.15,"QR",fontsize=6,color=CHAR,ha="center")
axF.text(0.9,6.5,"$49.99",fontsize=11,color=CORAL,fontweight="bold",ha="center")
# tray body
axF.add_patch(Rectangle((0,0),6,6,facecolor="#f3efe6",edgecolor=CHAR,lw=1.6))
# 6 stick slots
for i in range(6):
    x=0.45+i*0.92
    axF.add_patch(Rectangle((x,1.0),0.62,4.4,facecolor=CORAL,edgecolor=CHAR,lw=0.8))
    axF.add_patch(Rectangle((x,5.1),0.62,0.3,facecolor=CREAM,edgecolor=CHAR,lw=0.5))
axF.text(3,0.5,"STRAWBERRY GUAVA",fontsize=7,color=CORAL,fontweight="bold",ha="center")
# cash box to the right
bx=6.9
axF.add_patch(Rectangle((bx,0),5,6,facecolor="#1c1a14",edgecolor=CHAR,lw=1.6))
axF.add_patch(Rectangle((bx+1.7,5.7),1.6,0.18,facecolor="#000",edgecolor=GREY,lw=0.6)) # coin slot
axF.add_patch(Circle((bx+2.5,4.4),0.28,facecolor="#bbb",edgecolor="#444",lw=0.8))       # lock
axF.text(bx+2.5,3.4,"GRAB A STICK",fontsize=7.5,color=CREAM,ha="center")
axF.text(bx+2.5,2.5,"$2",fontsize=20,color=CORAL,fontweight="bold",ha="center")
axF.text(bx+2.5,1.7,"CASH HONOR SYSTEM",fontsize=6,color=CREAM,ha="center")
# dimensions
dim(axF,-0.7,0,-0.7,10,'10 in',vert=True)
dim(axF,0,10.6,6,10.6,'6 in')
dim(axF,bx,-0.7,bx+5,-0.7,'5 in')
dim(axF,bx+5.4,0,bx+5.4,6,'6 in',vert=True)
axF.text(3,-1.35,"header placard 6 x 4 in  ·  holds ~24-36 sticks face-out",fontsize=8,color=INK,ha="center")
axF.set_xlim(-2,12.6); axF.set_ylim(-1.8,11.4); axF.set_aspect("equal"); axF.axis("off")

# ============ SIDE ELEVATION ============
axS.set_title("Side elevation",fontsize=13,color=CHAR,fontweight="bold",loc="left",pad=12)
# tray/header depth 4; header angled back
axS.add_patch(Rectangle((0,0),4,6,facecolor="#f3efe6",edgecolor=CHAR,lw=1.6))   # tray depth 4
axS.add_patch(Polygon([(0,6),(4,6),(3.4,10),(0.6,10)],closed=True,facecolor=CREAM,edgecolor=CHAR,lw=1.6)) # angled header
axS.add_patch(Rectangle((4.6,0),3.2,6,facecolor="#1c1a14",edgecolor=CHAR,lw=1.6)) # cash box depth ~3
# sticks leaning
for i in range(3):
    axS.add_patch(Rectangle((0.7+i*1.0,1),0.5,4.2,facecolor=CORAL,edgecolor=CHAR,lw=0.6))
dim(axS,-0.7,0,-0.7,10,'10 in',vert=True)
dim(axS,0,-0.7,4,-0.7,'4 in')
dim(axS,4.6,-0.7,7.8,-0.7,'~5 in')
axS.text(4,-1.5,"depth: tray ~4 in, cash box ~5 in",fontsize=8,color=INK,ha="center")
axS.set_xlim(-2,8.6); axS.set_ylim(-1.8,11.4); axS.set_aspect("equal"); axS.axis("off")

fig.suptitle("KIMORA — Gym Counter Display  ·  Concept drawing (approximate, fabricator to confirm)",
             fontsize=14,color=CHAR,fontweight="bold",x=0.5,y=0.99)
fig.text(0.5,0.025,"Material: 3-5 mm acrylic  ·  Full-color header  ·  Integrated lockable cash box (coin slot + cam lock)  ·  Colors: cream / charcoal / coral  ·  Kimora Co. · alex@kimoraco.com",
         fontsize=8.5,color="#5f5747",ha="center")
plt.subplots_adjust(left=0.05,right=0.97,top=0.9,bottom=0.08,wspace=0.1)
fig.savefig("Kimora_Display_Drawing.png",dpi=150,facecolor="white")
fig.savefig("Kimora_Display_Drawing.pdf",facecolor="white")
print("saved drawing PNG + PDF")
