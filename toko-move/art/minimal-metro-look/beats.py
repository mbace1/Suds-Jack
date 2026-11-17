"""The three story beats (schematic). Centre = (lat, lon); mpp = metres per px at 1920 wide (16:9), mpp_v for 1080x1920."""
from bible_render import DAY, NIGHT, DISRUPT
import bible_render as B
BEATS = {
 'day': dict(  # Sealed Parcel: courier rides tram 4 up Mannerheimintie, yellow opportunity
    skin=DAY, center=(60.1755, 24.9365), mpp=4.2, mpp_v=4.6,
    labels=[('Päärautatieasema', 'RAUTATIENTORI', 1.2, -1), ('Lasipalatsi', 'LASIPALATSI', -1.3, .3), ('Ooppera', 'OOPPERA', -2.2, 0),
            ('Senaatintori', 'SENAATINTORI', 1, -1), ('Kampintori', 'KAMPPI', -1, 1), ('Hakaniemi (M)', 'HAKANIEMI', 1.4, 0)],
    vehicles=[('2', (60.1885, 24.9200), 0), ('7', (60.1640, 24.9450), 0), ('M', (60.1625, 24.9050), 0), ('M', (60.1840, 24.9560), 0),
              ('6', 'Hakaniemi', 18), ('1', 'Ooppera', 40), ('3', 'Kampintori', -20), ('9', (60.1850, 24.9510), 0), ('10', 'Lasipalatsi', 28)],
    courier=('4', (60.1762, 24.9328), 0), jobs=[('Ooppera', .62), ('Senaatintori', .85)],
    clock='07:42', hud=(1, 3, .62),
    card=('A rider at Lasipalatsi needs this before Töölö.', ('Take it', '+40 s'), ('Leave it', '+0 s'), 'opportunity')),
 'night': dict(  # Last metro east toward Vuosaari, cyan info
    skin=NIGHT, center=(60.1725, 24.9420), mpp=4.2, mpp_v=4.6,
    labels=[('Kampin metroasema', 'KAMPPI', -1.2, 1), ('Päärautatieasema', 'RAUTATIENTORI', 1.2, -1), ('Hakaniemen metroasema', 'HAKANIEMI', 1.4, 0),
            ('Senaatintori', 'SENAATINTORI', 1, -1), ('Ooppera', 'OOPPERA', -2.2, 0), ('Ruoholahden metroasema', 'RUOHOLAHTI', 0, 1.2)],
    extra_hubs=('Kampin metroasema', 'Hakaniemen metroasema', 'Ruoholahden metroasema'),
    vehicles=[('4', 'Senaatintori', -20), ('2', 'Ooppera', -22), ('7', (60.1640, 24.9450), 0), ('M', 'Hakaniemen metroasema', 20), ('3', 'Kampintori', -20),
              ('6', 'Hakaniemi', 18), ('9', 'Lasipalatsi', 30), ('1', 'Ooppera', 40)],
    courier=('M', 'Kampin metroasema', 6), jobs=[('Hakaniemi (M)', .34)],
    clock='23:51', hud=(2, 3, .34),
    card=('Last metro to Vuosaari leaves Kamppi.', ('Catch it', '+60 s'), ('Walk', '+900 s'), 'info')),
 'disruption': dict(  # Line 4 halted at Ooppera, coral warning
    skin=DISRUPT, halted='4', halt_at='Ooppera', center=(60.1770, 24.9330), mpp=4.2, mpp_v=4.6,
    labels=[('Ooppera', 'OOPPERA', -2.4, 0), ('Päärautatieasema', 'RAUTATIENTORI', 1.2, -1), ('Lasipalatsi', 'LASIPALATSI', -1.3, .3),
            ('Töölöntulli', 'TÖÖLÖ', -1, 0), ('Kampintori', 'KAMPPI', -1, 1), ('Senaatintori', 'SENAATINTORI', 1, -1)],
    vehicles=[('4', 'Ooppera', -16), ('4', 'Lasipalatsi', -20), ('2', 'Ooppera', 26), ('7', (60.1640, 24.9450), 0), ('M', 'Kampin metroasema', 40),
              ('1', 'Ooppera', 40), ('3', 'Kampintori', -20), ('10', 'Lasipalatsi', 28), ('6', 'Hakaniemi', 18)],
    courier=('4', 'Ooppera', -8), jobs=[('Töölöntulli', .26)],
    clock='07:42', hud=(1, 3, .26),
    card=('Line 4 is halted at Ooppera.', ('Walk to the 2', '+90 s'), ('Wait it out', '+420 s'), 'warning')),
}

# card lines per Toko mood (stamps, close-ups, MP4)
STAMPS = {'info': (NIGHT, 'Last metro to Vuosaari leaves Kamppi.', ('Catch it', '+60 s'), ('Walk', '+900 s')),
          'opportunity': (DAY, 'A rider at Lasipalatsi needs this before Töölö.', ('Take it', '+40 s'), ('Leave it', '+0 s')),
          'warning': (B.DISRUPT, 'Line 4 is halted at Ooppera.', ('Walk to the 2', '+90 s'), ('Wait it out', '+420 s')),
          'notice': (DAY, 'Inspectors board the 4 at Rautatientori.', ('Show the app', '+15 s'), ('Step off', '+120 s'))}
