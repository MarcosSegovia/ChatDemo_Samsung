    $(function(){

        String.prototype.toHHMMSS = function () {
            var sec_num = parseInt(this, 10); // don't forget the second parm
            var hours   = Math.floor(sec_num / 3600);
            var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
            var seconds = sec_num - (hours * 3600) - (minutes * 60);

            if (hours   < 10) {hours   = "0"+hours;}
            if (minutes < 10) {minutes = "0"+minutes;}
            if (seconds < 10) {seconds = "0"+seconds;}
            var time    = hours+':'+minutes+':'+seconds;
            return time;
        }

        function App(){

            console.info("Starting Application");

            var app = this;

            // Create some public variables
            this.channelId = "com.samsung.multiscreen.chatdemo";            
            this.runtTitle = "ChatDemo";
            this.channel = null;
            this.currentDevice = null;
            this.channelMessage = [];

            // media variables
            this.videoCurrentTime = 0;
            this.videoDuration = null;
            this.isSeeking = false;
            this.isDown = false;

            // UI elements
            this.btnDevices = $("#btnDevices");
            this.btnFindLocal = $("#btnFindLocal");
            this.btnFindByPin = $("#btnFindByPin");
            this.btnDisconnect = $("#btnDisconnect");
            this.btnTerminateApp = $("#btnTerminateApp");
            this.modalFoundDevices = $("#modalFoundDevices");
            this.modalDevices = $("#modalDevices");
            this.modalDisconnect = $("#modalDisconnect");
            
            this.listFoundDevices = $("#listFoundDevices");
            this.listSendTargets = $("#listSendTargets");
            this.playerControls = $("#playerControls");
            this.seekbar = $("#seekbar");
            this.listMessages = $("#listMessages");
            this.txtMessage = $("#txtMessage");
            this.txtPinCode = $("#txtPinCode");
            this.txtPinCode.mask("999-999", {placeholder:""});
            this.txtPinCode.focus(function(evt){
                $(evt.currentTarget).val();
            });
            this.listFoundDevices.on("click", "li", $.proxy(this.onDeviceSelect, this));
            this.listSendTargets.on("click", "li a", $.proxy(this.onSendToTarget, this));
            this.playerControls.on("click", "li a", $.proxy(this.onSendVideoControl, this));
            this.btnFindByPin.on("click", $.proxy(this.findDeviceByPin, this));
            this.btnFindLocal.on("click", $.proxy(this.findLocalDevices,this));
            this.btnDisconnect.on("click", $.proxy(this.disconnect, this));
            this.btnDevices.on("click", $.proxy(this.toggleConnectModal, this));
            this.btnTerminateApp.on("click", $.proxy(this.terminate, this));

            this.bindUIElements();

        }

        App.prototype.bindUIElements = function(){
            var app = this;

            $(".timer").html("0".toHHMMSS());

            $(".chat-screen").on('click', function(evt){
                $("#listMessages").show();
                $("#videoPlayer").hide();
                $(".video-screen").removeClass("active");    
                $(".chat-screen").addClass("active");
            });
            $(".video-screen").on('click', function(evt){
                $("#listMessages").hide();
                $("#videoPlayer").show();
                $(".chat-screen").removeClass("active");    
                $(".video-screen").addClass("active");    
            });

            // bind scrubber events
            this.seekbar.on('mousedown click touchstart', function(evt){
                app.isDown = true;
                app.isSeeking = true;
            });

            $(document).on('mouseup touchend', function(evt){
                if(app.isDown){
                    app.isSeeking = false;
                    var tvMessage = {
                        "type" : "video",
                        "state" : "seek", 
                        "currentTime" : app.seekbar.val()
                    };
                    app.channel.send(JSON.stringify(tvMessage), "host");
                }
                app.isDown = false;
            });
        };

        // handle sending chat messages
        App.prototype.onSendToTarget = function(evt){
            var target = $(evt.currentTarget).attr("data-var");
            var message = {
                "type": "chat",
                "text": this.txtMessage.val()
            };
            var encrypt = $("#cbEncrypted").prop('checked');
            this.txtMessage.val("");
            this.channel.send(JSON.stringify(message),target, encrypt);
        };

        // handle sending media player messages
        App.prototype.onSendVideoControl = function(evt){
            var target = "host";
            var videoCommand = $(evt.currentTarget).attr("id");
            if(videoCommand == "stop"){
                $(".timer").html("0".toHHMMSS());    
                $("#seekbar").val(0);
            }
            var message = {
                "type": "video",
                "state": videoCommand
            };
            this.channel.send(JSON.stringify(message),target);
        };

        App.prototype.toggleConnectModal = function(){
            if(this.channel && this.channel.isConnected){
                this.modalDisconnect.modal('show');
            }else{
                this.modalDevices.modal('show');
            }
        };

        App.prototype.disconnect = function(){
            this.channel.disconnect();
            this.modalDisconnect.modal('hide');
        };

        App.prototype.terminate = function(){
            if(this.currentApp){
                this.currentApp.terminate($.proxy(this.onTerminate, this), this.onError);
            }
            this.modalDisconnect.modal('hide');
        };

        App.prototype.onTerminate = function(){
            alert("Application has been closed");
        };

        App.prototype.findDeviceByPin = function(){
            this.modalDevices.modal('hide');
            
            var code = this.txtPinCode.val().replace("-","");
            window.webapis.multiscreen.Device.findByCode(code, $.proxy(this.onFindByPin, this), this.onError);
        };

        App.prototype.onFindByPin = function(device){
            this.currentDevice = device;
            $("#modalLoading").showLoading();
            this.onSelectDevice();
        };

        App.prototype.findLocalDevices = function(){
            var app = this;
            app.modalDevices.modal('hide');
            $("#modalLoading").showLoading();
            window.webapis.multiscreen.Device.search($.proxy(this.onFindLocal, this), this.onError);
        };

        App.prototype.onFindLocal = function(devices){
            $("#modalLoading").hideLoading();

            if(devices.length > 0){

                this.listFoundDevices.empty();

                for(var i=0; i<devices.length; i++){
                    if(devices[i] !== null){
                        var li = $('<li/>', {
                            rel: 'external',
                            text: devices[i].name,
                            class: 'list-group-item'
                        });

                        li[0].data = devices[i]; // Shortcut to store the data
                        this.listFoundDevices.append(li);
                    }
                }

                this.modalFoundDevices.modal();

            }else{
                alert("No Devices Found");
            }
        };

        App.prototype.updateConnectionStatus = function(){
            if(this.channel && this.channel.isConnected){
                this.btnDevices.removeClass("disconnected");
                this.btnDevices.addClass("connected");
            }else{
                this.btnDevices.removeClass("connected");
                this.btnDevices.addClass("disconnected");
            }
        };

        App.prototype.updateSendTargets = function(){

            this.listSendTargets.empty();
            var defaults = [
                {val : "all", name : "All"},
                {val : "broadcast", name : "Broadcast"},
                {val : "host", name : "Host"}
            ];

            for(var i=0; i<defaults.length; i++){
                this.listSendTargets.append("<li><a href='#' data-var='"+defaults[i].val+"'>"+defaults[i].name+"</a></li>");
            }

            this.listSendTargets.append("<li class='divider'></li>");
            this.channel.clients.forEach(function(client){
                this.listSendTargets.append("<li><a href='#' data-var='"+client.id+"'>"+client.attributes.name || "Client "+client.id+"</a></li>");
            },this);
        };

        App.prototype.onDeviceSelect = function(evt){
            this.currentDevice = $(evt.currentTarget)[0].data;
            this.modalFoundDevices.modal('hide');
             $("#modalLoading").showLoading();
            this.onSelectDevice();
        };

        App.prototype.onSelectDevice = function(){
            //$("#modalLoading").hideLoading();
            this.currentDevice.getApplication("ChatDemo", $.proxy(this.onGetApplication, this), this.onError);
        };

        App.prototype.onGetApplication = function(application){
            this.currentApp = application;
            var self = this;
            if(application.lastKnownStatus !== "running"){
                this.currentApp.launch({"launcher":"mobile-chat"}, $.proxy(this.onLaunch, this), this.onError);
            }else{
                self.currentDevice.connectToChannel(self.channelId, {name:"Mobile-"+Date.now()}, $.proxy(self.onConnect, self), self.onError);
            }
            
        };

        App.prototype.onLaunch = function(application){
            var self = this;
            console.log(arguments, application);
            self.currentDevice.connectToChannel(self.channelId, {name:"Mobile-"+Date.now()}, $.proxy(self.onConnect, self), self.onError);
        };

        App.prototype.onConnect = function(channel){

            var app = this;
             $("#modalLoading").hideLoading();
            this.channel = channel;
            this.updateConnectionStatus();
            this.updateSendTargets();

            // Wire up some event handlers
            this.channel.on("disconnect", function(myClient){
                app.updateConnectionStatus("disconnected");
                app.channel = null;
            });

            this.channel.on("clientConnect", function(client){
                app.updateSendTargets();
            });

            this.channel.on("clientDisconnect", function(){
                app.updateSendTargets();
            });

            this.channel.on("message", function(msg, client){
                var message = JSON.parse(msg);
                app.onMessage(message, client);
            });

        };

        App.prototype.onMessage = function(message, client){
            
            var seekbar = this.seekbar;

            // handle receiving player messages
            if(message.type === "video"){ 

                $('.timer').html(message.currentTime.toString().toHHMMSS());
                
                if(this.isDown == false){
                    seekbar.val(this.videoCurrentTime);
                }
                
                this.videoCurrentTime = message.currentTime;
                this.videoDuration = message.duration;
                seekbar.attr('max', this.videoDuration);
                
                if(message.state === "stop"){
                    $(".timer").html("0".toHHMMSS());    
                    $("#seekbar").val(0);
                }
            }

            // handle receiving player messages
            if(message.type === "chat"){
                var messageHtml = '<li class="list-group-item">' +
                    '<h4 class="list-group-item-heading"><span class="glyphicon glyphicon-comment"></span> '+client.attributes.name+'('+new Date().toLocaleTimeString()+')</h4>' +
                    '<p class="list-group-item-text">'+message.text+'</p>' +
                    '</li>';

                this.listMessages.prepend(messageHtml);
            }
        };

        App.prototype.onError = function(error){
            $(document.body).hideLoading();
            alert(error.message);
        };

        // storing on the window for easier debug (watching);
        window.App = new App();

    });




