# ZPI

A full-stack application with Django backend and React frontend.

## Project Structure

- `backend/` - Django REST API
- `frontend/frontend/` - React application with Vite

## Prerequisites

- Python 3.8+ 
- Node.js 16+
- npm or yarn

## Running the Application

### Backend (Django)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # On Windows
   # source venv/bin/activate  # On macOS/Linux
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run database migrations:
   ```bash
   python manage.py migrate
   ```

5. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

The backend will be available at `http://localhost:8000`

### Frontend (React)

1. Navigate to the frontend directory:
   ```bash
   cd frontend/frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## Development

- Backend runs on port 8000
- Frontend runs on port 5173
- Make sure both servers are running for full functionality

## DODAWANIE ADMINA ZJEBANYM SPOSOBEM BARTKA
```bash
python manage.py ensure_dev_admin
```
