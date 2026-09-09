import pathlib
script=pathlib.Path(__file__).with_name('export.py')
exec(script.read_text().split('\nclean()\n')[0])
bpy.ops.wm.open_mainfile(filepath=str(SRC/'warehouse.blend'))
join_by_material();mobile('warehouse',.38)
