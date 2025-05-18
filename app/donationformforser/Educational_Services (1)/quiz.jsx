"use client";

import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";

// Import Firebase with error handling
let db;
try {
  const { db: firebaseDb } = require("../firebase/config");
  db = firebaseDb;
} catch (error) {
  console.error("Firebase config not found, using mock data instead");
}

// Mock data for when Firebase is not available
const MOCK_QUESTIONS = [
  {
    id: "q1",
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: "Paris",
    category: "general",
    difficulty: "easy",
  },
  {
    id: "q2",
    question: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Jupiter", "Venus"],
    correctAnswer: "Mars",
    category: "science",
    difficulty: "easy",
  },
  {
    id: "q3",
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: "4",
    category: "math",
    difficulty: "easy",
  },
  {
    id: "q4",
    question: "Who painted the Mona Lisa?",
    options: [
      "Vincent van Gogh",
      "Pablo Picasso",
      "Leonardo da Vinci",
      "Michelangelo",
    ],
    correctAnswer: "Leonardo da Vinci",
    category: "art",
    difficulty: "medium",
  },
  {
    id: "q5",
    question: "Which language is React built with?",
    options: ["Java", "Python", "C++", "JavaScript"],
    correctAnswer: "JavaScript",
    category: "tech",
    difficulty: "medium",
  },
];

// Your existing fetch function with fallback to mock data
const fetchCustomQuestions = async (category, difficulty) => {
  // If Firebase is not available, return mock data
  if (!db) {
    console.log("Using mock data since Firebase is not available");
    return MOCK_QUESTIONS.filter(
      (q) =>
        (category === "all" || q.category === category) &&
        (difficulty === "all" || q.difficulty === difficulty)
    );
  }

  try {
    // If Firebase is available, query the database
    let q;

    if (category === "all" && difficulty === "all") {
      q = collection(db, "questions");
    } else if (category === "all") {
      q = query(
        collection(db, "questions"),
        where("difficulty", "==", difficulty)
      );
    } else if (difficulty === "all") {
      q = query(collection(db, "questions"), where("category", "==", category));
    } else {
      q = query(
        collection(db, "questions"),
        where("category", "==", category),
        where("difficulty", "==", difficulty)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching questions from Firebase:", error);
    // Fallback to mock data on error
    return MOCK_QUESTIONS.filter(
      (q) =>
        (category === "all" || q.category === category) &&
        (difficulty === "all" || q.difficulty === difficulty)
    );
  }
};

export default function Quiz() {
  // State variables
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("all"); // Default category
  const [difficulty, setDifficulty] = useState("all"); // Default difficulty
  const [quizStarted, setQuizStarted] = useState(false);

  // Categories and difficulties for selection
  const categories = [
    { id: "all", name: "All Categories" },
    { id: "general", name: "General Knowledge" },
    { id: "science", name: "Science" },
    { id: "math", name: "Mathematics" },
    { id: "tech", name: "Technology" },
    { id: "art", name: "Art & Culture" },
  ];

  const difficulties = [
    { id: "all", name: "All Difficulties" },
    { id: "easy", name: "Easy" },
    { id: "medium", name: "Medium" },
    { id: "hard", name: "Hard" },
  ];

  // Function to load questions based on selected category and difficulty
  const loadQuestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedQuestions = await fetchCustomQuestions(category, difficulty);

      if (fetchedQuestions.length === 0) {
        setError(
          `No questions found for the selected filters. Please try different options.`
        );
      } else {
        setQuestions(fetchedQuestions);
        setSelectedAnswers({});
        setCurrentQuestionIndex(0);
        setShowResults(false);
        setQuizStarted(true);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      setError("Failed to load questions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: answer,
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    let userScore = 0;
    questions.forEach((question) => {
      if (selectedAnswers[question.id] === question.correctAnswer) {
        userScore++;
      }
    });
    setScore(userScore);
    setShowResults(true);
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
  };

  // Quiz setup screen
  if (!quizStarted) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Quiz Setup</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Category:
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Difficulty:
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {difficulties.map((diff) => (
              <option key={diff.id} value={diff.id}>
                {diff.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadQuestions}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Start Quiz
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-xl font-semibold">Loading questions...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-xl font-semibold text-red-500 mb-4">{error}</div>
        <button
          onClick={resetQuiz}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Setup
        </button>
      </div>
    );
  }

  // No questions available
  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-xl font-semibold mb-4">
          No questions available for this category and difficulty.
        </div>
        <button
          onClick={resetQuiz}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Setup
        </button>
      </div>
    );
  }

  // Results screen
  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Quiz Results</h2>
        <div className="text-center mb-6">
          <p className="text-xl">
            Your score: {score} out of {questions.length}
          </p>
          <p className="text-lg mt-2">
            Percentage: {Math.round((score / questions.length) * 100)}%
          </p>
        </div>
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Review Answers:</h3>
          {questions.map((question) => (
            <div key={question.id} className="mb-6 p-4 border rounded-lg">
              <p className="font-medium mb-2">{question.question}</p>
              <p className="mb-1">
                Your answer:{" "}
                <span
                  className={
                    selectedAnswers[question.id] === question.correctAnswer
                      ? "text-green-600 font-medium"
                      : "text-red-600 font-medium"
                  }
                >
                  {selectedAnswers[question.id] || "Not answered"}
                </span>
              </p>
              <p className="text-green-600 font-medium">
                Correct answer: {question.correctAnswer}
              </p>
            </div>
          ))}
        </div>
        <div className="flex space-x-4 mt-6">
          <button
            onClick={resetQuiz}
            className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            New Quiz
          </button>
          <button
            onClick={() => {
              setShowResults(false);
              setCurrentQuestionIndex(0);
              setSelectedAnswers({});
            }}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Quiz questions screen
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Question {currentQuestionIndex + 1}/{questions.length}
          </h2>
          <div className="text-sm text-gray-500">
            {Object.keys(selectedAnswers).length}/{questions.length} answered
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{
              width: `${
                ((currentQuestionIndex + 1) / questions.length) * 100
              }%`,
            }}
          ></div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">{currentQuestion.question}</h3>
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              onClick={() => handleAnswerSelect(currentQuestion.id, option)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedAnswers[currentQuestion.id] === option
                  ? "bg-blue-100 border-blue-500"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                    selectedAnswers[currentQuestion.id] === option
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-400"
                  }`}
                >
                  {selectedAnswers[currentQuestion.id] === option && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <span>{option}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={handlePrevQuestion}
          disabled={currentQuestionIndex === 0}
          className={`py-2 px-4 rounded-md ${
            currentQuestionIndex === 0
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gray-200 hover:bg-gray-300 transition-colors"
          }`}
        >
          Previous
        </button>

        {currentQuestionIndex === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
