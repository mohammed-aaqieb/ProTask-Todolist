from app import app, db
from models import Task
from sqlalchemy import inspect

with app.app_context():
    inspector = inspect(db.engine)
    if inspector.has_table('task'):
        print("Table 'task' exists.")
        columns = [c['name'] for c in inspector.get_columns('task')]
        print(f"Columns: {columns}")
    else:
        print("Table 'task' does NOT exist.")
