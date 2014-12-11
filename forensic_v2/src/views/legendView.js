define(['hbs!templates/legend','../util/events','../config/forensic_config'], function(legendTemplate,events,ForensicConfig) {

	/**
	 * Creates the navbar view
	 * @param element - the parent DOM element
	 * @param context - the context for the navbar view template
	 * @constructor
	 */
	function LegendView(element) {
		this._parent = element;
		this._canvas = null;
		this._isVisible = ForensicConfig.showLegendOnStart;
		this._initialize(element,{
			items : [
				{
					text : 'Websites',
					color : ForensicConfig.BROWSE_PATH_ENTITY.FILL_STYLE
				},
				{
					text : 'Email Addresses',
					color : ForensicConfig.EMAIL_ENTITY.FILL_STYLE
				},
				{
					text : 'Phone Numbers',
					color : ForensicConfig.PHONE_ENTITY.FILL_STYLE

				}
			]
		});
	}

	/**
	 * Initializes the navbar view.   Bind search functionality.   Context expects
	 * a list of trails fetched from the server
	 * @param element - the parent DOM element
	 * @param context - the context for the navbar view template
	 * @private
	 */
	LegendView.prototype._initialize = function(element,context) {
		this._bindEventHandlers();
		this._canvas = $(legendTemplate(context));

		var top = $('.navbar').height();
		this._parent.css('top',top + 'px');
		this._parent.css('opacity',this._isVisible ? 1 : 0);


		this._canvas.appendTo(element);
	};

	LegendView.prototype._onToggle = function() {
		if (this._isVisible) {
			this._canvas.animate({opacity:0});
		} else {
			this._canvas.animate({opacity:1});
		}
		this._isVisible = !this._isVisible;
	};

	/**
	 * Adds any event handlers for custom message passing
	 * @private
	 */
	LegendView.prototype._bindEventHandlers = function() {
		events.subscribe(events.topics.TOGGLE_LEGEND,this._onToggle,this);
	};

	return LegendView;
});