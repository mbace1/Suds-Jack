# Toko Slomo: segment the masked chef out of the approved v02 painting (GrabCut seeded by hand polygons)
import cv2, numpy as np, json, sys
D = sys.argv[1]
im = cv2.imread(f'{D}/src.png'); H, W = im.shape[:2]
P = lambda pts: np.array(pts, np.int32)
OUTER = P([(662,148),(688,116),(805,116),(824,150),(836,222),(832,282),(866,280),(912,302),(950,382),(956,424),(940,474),(895,492),(852,508),(772,505),(760,478),(665,476),(570,446),(560,392),(592,330),(632,288),(682,272),(680,220)])
SURE = [P([(705,165),(810,165),(822,250),(800,315),(715,315),(695,250)]),      # hood
        P([(640,320),(880,320),(905,360),(915,440),(600,440),(605,360)]),      # torso and arms
        P([(820,425),(890,430),(900,470),(830,470)])]                          # left hand
BG_COUNTER = P([(560,458),(640,458),(640,520),(560,520)])                      # the counter left of the cloth
mask = np.full((H, W), cv2.GC_BGD, np.uint8)
cv2.fillPoly(mask, [OUTER], cv2.GC_PR_FGD)
for p in SURE: cv2.fillPoly(mask, [p], cv2.GC_FGD)
cv2.fillPoly(mask, [BG_COUNTER], cv2.GC_BGD)
bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
cv2.grabCut(im, mask, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
# keep the largest component, fill holes
n, lab, st, _ = cv2.connectedComponentsWithStats(m); k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); m = np.where(lab == k, 255, 0).astype(np.uint8)
inv = cv2.bitwise_not(m); n, lab, st, _ = cv2.connectedComponentsWithStats(inv)
for i in range(1, n):
    x, y, w, h, a = st[i]
    if x > 0 and y > 0 and x + w < W and y + h < H and a < 4000: m[lab == i] = 255
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
cv2.imwrite(f'{D}/m_toko.png', m)
ov = im.copy(); ov[m == 0] = (ov[m == 0] * 0.25).astype(np.uint8)
cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(ov, cnts, -1, (0, 255, 0), 1)
cv2.imwrite(f'{D}/ov_toko.png', cv2.resize(ov[100:530, 540:980], None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST))
print('area', int((m > 0).sum()))
