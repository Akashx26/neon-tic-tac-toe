
import random

# ==========================================
# 1. WINNING COMBINATIONS
# ==========================================

WINNING_COMBINATIONS = [
    (0, 1, 2),  # Top row
    (3, 4, 5),  # Middle row
    (6, 7, 8),  # Bottom row

    (0, 3, 6),  # Left column
    (1, 4, 7),  # Middle column
    (2, 5, 8),  # Right column

    (0, 4, 8),  # Diagonal
    (2, 4, 6)   # Diagonal
]


# ==========================================
# 2. CHECK WINNER
# ==========================================

def check_winner(board):
    """
    Checks whether X or O has won.

    Returns:
        'X' if X wins
        'O' if O wins
        None if nobody has won
    """

    for a, b, c in WINNING_COMBINATIONS:

        if board[a] and board[a] == board[b] == board[c]:
            return board[a]

    return None


# ==========================================
# 3. CHECK DRAW
# ==========================================

def is_draw(board):
    """
    A draw happens when:
    - All 9 cells are occupied.
    - Nobody has won.
    """

    return check_winner(board) is None and "" not in board


# ==========================================
# 4. GET AVAILABLE MOVES
# ==========================================

def get_available_moves(board):
    """
    Returns the positions of all empty cells.
    """

    return [
        i for i in range(9)
        if board[i] == ""
    ]


# ==========================================
# 5. FIND A WINNING MOVE
# ==========================================

def find_winning_move(board, symbol):
    """
    Checks whether a symbol can win immediately.

    Returns the winning position if available.
    Otherwise returns None.
    """

    for position in get_available_moves(board):

        test_board = board.copy()
        test_board[position] = symbol

        if check_winner(test_board) == symbol:
            return position

    return None


# ==========================================
# 6. EASY DIFFICULTY
# ==========================================

def easy_ai(board):
    """
    Easy AI:
    Selects a random empty position.
    """

    available_moves = get_available_moves(board)

    if not available_moves:
        return None

    return random.choice(available_moves)


# ==========================================
# 7. MEDIUM DIFFICULTY
# ==========================================

def medium_ai(board, computer, human):
    """
    Medium AI strategy:

    1. Win if possible.
    2. Block the human's winning move.
    3. Take the center.
    4. Take the opposite corner.
    5. Take an available corner.
    6. Take an available side.
    """

    # Step 1: Try to win
    move = find_winning_move(board, computer)

    if move is not None:
        return move

    # Step 2: Block the opponent
    move = find_winning_move(board, human)

    if move is not None:
        return move

    # Step 3: Take the center
    if board[4] == "":
        return 4

    # Step 4: Take the opposite corner
    opposite_corners = {
        0: 8,
        2: 6,
        6: 2,
        8: 0
    }

    for corner, opposite in opposite_corners.items():

        if board[corner] == human and board[opposite] == "":
            return opposite

    # Step 5: Take an available corner
    corners = [
        i for i in [0, 2, 6, 8]
        if board[i] == ""
    ]

    if corners:
        return random.choice(corners)

    # Step 6: Take an available side
    sides = [
        i for i in [1, 3, 5, 7]
        if board[i] == ""
    ]

    if sides:
        return random.choice(sides)

    return None


# ==========================================
# 8. MINIMAX ALGORITHM
# ==========================================

def minimax(board, depth, maximizing, computer, human):
    """
    Minimax explores possible future moves.

    Maximizing player = Computer
    Minimizing player = Human

    Returns a score for the current board.
    """

    winner = check_winner(board)

    # Computer wins
    if winner == computer:
        return 10 - depth

    # Human wins
    if winner == human:
        return depth - 10

    # Draw
    if "" not in board:
        return 0

    # Computer's turn: maximize score
    if maximizing:

        best_score = float("-inf")

        for position in get_available_moves(board):

            board[position] = computer

            score = minimax(
                board,
                depth + 1,
                False,
                computer,
                human
            )

            # Undo the temporary move
            board[position] = ""

            best_score = max(best_score, score)

        return best_score

    # Human's turn: minimize computer's score
    else:

        best_score = float("inf")

        for position in get_available_moves(board):

            board[position] = human

            score = minimax(
                board,
                depth + 1,
                True,
                computer,
                human
            )

            # Undo the temporary move
            board[position] = ""

            best_score = min(best_score, score)

        return best_score


# ==========================================
# 9. HARD DIFFICULTY
# ==========================================

def hard_ai(board, computer, human):
    """
    Hard AI uses Minimax to find
    the optimal available move.
    """

    best_score = float("-inf")
    best_moves = []

    for position in get_available_moves(board):

        board[position] = computer

        score = minimax(
            board,
            0,
            False,
            computer,
            human
        )

        # Undo the temporary move
        board[position] = ""

        if score > best_score:

            best_score = score
            best_moves = [position]

        elif score == best_score:

            best_moves.append(position)

    if not best_moves:
        return None

    return random.choice(best_moves)


# ==========================================
# 10. MAIN AI CONTROLLER
# ==========================================

def get_computer_move(board, difficulty, computer):
    """
    Selects the appropriate AI based
    on the chosen difficulty.
    """

    human = "O" if computer == "X" else "X"

    if difficulty == "Easy":

        return easy_ai(board)

    elif difficulty == "Medium":

        return medium_ai(board, computer, human)

    elif difficulty == "Hard":

        return hard_ai(board, computer, human)

    else:

        raise ValueError("Invalid difficulty level")
