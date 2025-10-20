import React, { useState } from 'react';
import './NotesScreen.css';
import PageLayout from '../layout/PageLayout.tsx';
import Card from '../layout/Card.tsx';
import Button from '../buttons/Button.tsx';

interface NotesScreenProps {
  onNotesComplete: (notes: string) => void;
}

const NotesScreen: React.FC<NotesScreenProps> = ({ onNotesComplete }) => {
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onNotesComplete(notes);
  };

  const handleSkip = () => {
    onNotesComplete('');
  };

  return (
    <PageLayout showNavbar={false}>
      <Card className={'notes-screen-container'}>
        <h1 className={'notes-header'}>Notes</h1>
        <p className="notes-description">
          Add any observations or notes about this vision test (optional)
        </p>
        <textarea
          id="test-notes"
          className="notes-textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Enter any relevant observations, lighting conditions, or other notes about this test..."
          rows={10}
        />

        <div className="notes-actions">
          <Button variant={'secondary'} onClick={handleSkip}>
            Skip
          </Button>
          <Button variant={'primary'} onClick={handleSubmit}>
            Continue
          </Button>
        </div>
      </Card>
    </PageLayout>
  );
};

export default NotesScreen;
