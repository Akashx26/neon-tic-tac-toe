
from flask import Flask, render_template, request, jsonify, session
import game_logic
import os


# ==========================================
# 1. INITIALIZE FLASK APPLICATION
# ==========================================

app = Flask(__name__)

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "tic-tac-toe-development-key-change-before-deployment"
)


# ==========================================
# 2. INITIALIZE SESSION
# ==========================================

def initialize_session():

    defaults = {
        "board": [""] * 9,
        "mode": "VS Computer",
        "difficulty": "Medium",
        "human_symbol": "X",
        "computer_symbol": "O",
        "turn": "X",
        "current_starter": "X",
        "next_starter": "X",
        "game_over": False,
        "winner": None,
        "active": False,
        "scores_by_mode": {
            "VS Computer": {
                "X": 0,
                "O": 0,
                "Draws": 0
            },
            "Player VS Player": {
                "X": 0,
                "O": 0,
                "Draws": 0
            }
        }
    }

    for key, value in defaults.items():
        if key not in session:
            session[key] = (
                value.copy()
                if isinstance(value, (list, dict))
                else value
            )


# ==========================================
# 3. GET GAME STATE
# ==========================================

def get_game_state():

    return {
        "board": session["board"],
        "mode": session["mode"],
        "difficulty": session["difficulty"],
        "human_symbol": session["human_symbol"],
        "computer_symbol": session["computer_symbol"],
        "turn": session["turn"],
        "current_starter": session["current_starter"],
        "next_starter": session["next_starter"],
        "game_over": session["game_over"],
        "winner": session["winner"],
        "active": session["active"],
        "scores_by_mode": session["scores_by_mode"]
    }


# ==========================================
# 4. FINISH GAME
# ==========================================

def finish_game():

    winner = game_logic.check_winner(session["board"])

    scores_by_mode = session["scores_by_mode"].copy()
    mode_scores = scores_by_mode[session["mode"]].copy()

    if winner:

        session["winner"] = winner
        mode_scores[winner] += 1

    elif game_logic.is_draw(session["board"]):

        session["winner"] = "Draw"
        mode_scores["Draws"] += 1

    else:
        return False

    scores_by_mode[session["mode"]] = mode_scores
    session["scores_by_mode"] = scores_by_mode

    session["game_over"] = True
    session["active"] = False

    # Alternate the starting symbol for the next match.
    session["next_starter"] = (
        "O" if session["current_starter"] == "X" else "X"
    )

    session.modified = True

    return True


# ==========================================
# 5. COMPUTER MOVE
# ==========================================

def computer_move():

    if session["game_over"] or not session["active"]:
        return

    move = game_logic.get_computer_move(
        session["board"],
        session["difficulty"],
        session["computer_symbol"]
    )

    if move is not None:

        board = session["board"].copy()
        board[move] = session["computer_symbol"]

        session["board"] = board
        session.modified = True

        if not finish_game():
            session["turn"] = session["human_symbol"]

            session.modified = True


# ==========================================
# 6. START NEW MATCH
# ==========================================

def start_new_match():

    session["board"] = [""] * 9
    session["game_over"] = False
    session["winner"] = None
    session["active"] = True

    # Use the designated starting symbol.
    session["current_starter"] = session["next_starter"]
    session["turn"] = session["current_starter"]

    session.modified = True

    # IMPORTANT:
    # Do not make the computer move here.
    # The frontend will display the empty board first,
    # wait briefly, and then call /api/computer-move.


# ==========================================
# 7. HOME PAGE
# ==========================================

@app.route("/")
def home():

    initialize_session()

    return render_template("index.html")


# ==========================================
# 8. GET CURRENT GAME STATE API
# ==========================================

@app.route("/api/state", methods=["GET"])
def current_state():

    initialize_session()

    return jsonify(get_game_state())


# ==========================================
# 9. NEW GAME API
# ==========================================

@app.route("/api/new-game", methods=["POST"])
def new_game():

    initialize_session()

    data = request.get_json(silent=True) or {}

    mode = data.get("mode", "VS Computer")
    difficulty = data.get("difficulty", "Medium")
    human_symbol = data.get("symbol", "X")

    if mode not in ["VS Computer", "Player VS Player"]:
        return jsonify({
            "error": "Invalid game mode"
        }), 400

    if difficulty not in ["Easy", "Medium", "Hard"]:
        return jsonify({
            "error": "Invalid difficulty"
        }), 400

    if human_symbol not in ["X", "O"]:
        return jsonify({
            "error": "Invalid player symbol"
        }), 400

    session["mode"] = mode
    session["difficulty"] = difficulty

    if mode == "VS Computer":

        session["human_symbol"] = human_symbol

        session["computer_symbol"] = (
            "O" if human_symbol == "X" else "X"
        )

    else:

        session["human_symbol"] = "X"
        session["computer_symbol"] = "O"

    start_new_match()

    return jsonify(get_game_state())


# ==========================================
# 10. PLAYER MOVE API
# ==========================================

@app.route("/api/move", methods=["POST"])
def player_move():

    initialize_session()

    if not session["active"] or session["game_over"]:
        return jsonify({
            "error": "No active game"
        }), 400

    data = request.get_json(silent=True) or {}
    position = data.get("position")

    if type(position) is not int or position not in range(9):
        return jsonify({
            "error": "Invalid position"
        }), 400

    board = session["board"].copy()

    if board[position] != "":
        return jsonify({
            "error": "Cell already occupied"
        }), 400

    if (
        session["mode"] == "VS Computer"
        and session["turn"] != session["human_symbol"]
    ):
        return jsonify({
            "error": "It is not your turn"
        }), 400

    # Place the player's symbol.
    board[position] = session["turn"]

    session["board"] = board
    session.modified = True

    # Check whether the player's move ended the match.
    if finish_game():
        return jsonify(get_game_state())

    # Player VS Player: switch to the other player.
    if session["mode"] == "Player VS Player":

        session["turn"] = (
            "O" if session["turn"] == "X" else "X"
        )

    # VS Computer: mark it as the computer's turn.
    # The computer move happens in a separate API request.
    else:

        session["turn"] = session["computer_symbol"]

    session.modified = True

    return jsonify(get_game_state())


# ==========================================
# 11. COMPUTER MOVE API
# ==========================================

@app.route("/api/computer-move", methods=["POST"])
def computer_turn():

    initialize_session()

    if not session["active"] or session["game_over"]:
        return jsonify({
            "error": "No active game"
        }), 400

    if session["mode"] != "VS Computer":
        return jsonify({
            "error": "Computer moves are not enabled in this mode"
        }), 400

    if session["turn"] != session["computer_symbol"]:
        return jsonify({
            "error": "It is not the computer's turn"
        }), 400

    computer_move()

    return jsonify(get_game_state())


# ==========================================
# 12. RESET GAME AND SCORES
# ==========================================

@app.route("/api/reset", methods=["POST"])
def reset_game():

    initialize_session()

    session["scores_by_mode"] = {
        "VS Computer": {
            "X": 0,
            "O": 0,
            "Draws": 0
        },
        "Player VS Player": {
            "X": 0,
            "O": 0,
            "Draws": 0
        }
    }

    # Clear the current board without starting a match.
    session["board"] = [""] * 9
    session["game_over"] = False
    session["winner"] = None
    session["active"] = False
    session["turn"] = session["next_starter"]

    session.modified = True

    return jsonify(get_game_state())


# ==========================================
# 13. RUN APPLICATION
# ==========================================

if __name__ == "__main__":

    app.run(debug=True)
