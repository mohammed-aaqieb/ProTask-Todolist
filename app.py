from flask import Flask, render_template, request, jsonify
from models import db, Task
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo_v2.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stats', methods=['GET'])
def get_stats():
    total = Task.query.count()
    completed = Task.query.filter_by(status='Done').count()
    pending = total - completed
    return jsonify({
        'total': total,
        'completed': completed,
        'pending': pending
    })

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    query = Task.query.order_by(Task.created_at.desc())
    
    # Search filter
    search = request.args.get('search')
    if search:
        query = query.filter(Task.title.contains(search) | Task.description.contains(search))
        
    tasks = query.all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.json
    try:
        due_date = datetime.fromisoformat(data.get('due_date')) if data.get('due_date') else None
    except ValueError:
        due_date = None

    new_task = Task(
        title=data.get('title'),
        description=data.get('description', ''),
        priority=data.get('priority', 'Medium'),
        status='Todo',
        due_date=due_date
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/api/tasks/<int:id>', methods=['PUT'])
def update_task(id):
    task = Task.query.get_or_404(id)
    data = request.json
    
    if 'status' in data:
        task.status = data['status']
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'priority' in data:
        task.priority = data['priority']
    if 'due_date' in data:
         try:
            task.due_date = datetime.fromisoformat(data.get('due_date')) if data.get('due_date') else None
         except ValueError:
            pass
    
    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/api/tasks/<int:id>', methods=['DELETE'])
def delete_task(id):
    task = Task.query.get_or_404(id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'})

if __name__ == '__main__':
    app.run(debug=True)
